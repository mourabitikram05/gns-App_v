package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.DemandeDocumentRequest;
import com.gns.sirh.dto.DemandeDocumentResponse;
import com.gns.sirh.dto.IdLabelDto;
import com.gns.sirh.dto.StatsDocuments;
import com.gns.sirh.entity.*;
import com.gns.sirh.repository.DemandeDocumentRepository;
import com.gns.sirh.repository.DocumentTypeRepository;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.security.AuthUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DocumentService {

    private final DemandeDocumentRepository demandeRepository;
    private final DocumentTypeRepository typeRepository;
    private final EmployeRepository employeRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Path uploadDir;

    public DocumentService(DemandeDocumentRepository demandeRepository,
                           DocumentTypeRepository typeRepository,
                           EmployeRepository employeRepository,
                           NotificationService notificationService,
                           AuditService auditService,
                           @Value("${app.upload-dir}") String uploadDir) {
        this.demandeRepository = demandeRepository;
        this.typeRepository = typeRepository;
        this.employeRepository = employeRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.uploadDir = Paths.get(uploadDir).resolve("documents");
    }

    @Transactional(readOnly = true)
    public List<IdLabelDto> types() {
        return typeRepository.findAllByOrderByNomAsc()
                .stream().map(t -> new IdLabelDto(t.getId(), t.getNom())).toList();
    }

    @Transactional
    public DemandeDocumentResponse creerDemande(AuthUser user, DemandeDocumentRequest req) {
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        Employe employe = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        DocumentType type = typeRepository.findById(req.typeDocumentId())
                .orElseThrow(() -> new BusinessException("Type de document introuvable"));
        String format = "DIGITAL".equalsIgnoreCase(req.format()) ? "DIGITAL" : "PAPIER";

        DemandeDocument d = new DemandeDocument();
        d.setEmploye(employe);
        d.setTypeDocument(type);
        d.setFormat(format);
        d.setRemarque(req.remarque());
        d.setDateDemande(LocalDateTime.now());
        d.setStatut("EN_TRAITEMENT");
        d.setReference("DOC-" + LocalDate.now().getYear() + "-" + String.format("%05d", demandeRepository.count() + 1));
        DemandeDocument saved = demandeRepository.save(d);

        notificationService.notifierParRole(RoleType.RESPONSABLE_RH,
                "Nouvelle demande de document : " + type.getNom() + " (" + employe.getNomComplet() + ")",
                "DOCUMENT_DEMANDE");
        auditService.log(user.email(), "DEMANDE_DOCUMENT", "Demande " + saved.getReference() + " créée");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DemandeDocumentResponse> mesDemandes(Long employeId) {
        return demandeRepository.findByEmployeIdOrderByDateDemandeDesc(employeId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<DemandeDocumentResponse> listeRH() {
        return demandeRepository.findAllByOrderByDateDemandeDesc()
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public StatsDocuments stats() {
        return new StatsDocuments(demandeRepository.count(),
                demandeRepository.countByStatut("EN_TRAITEMENT"));
    }

    @Transactional
    public DemandeDocumentResponse traiter(Long id, String acteur) {
        DemandeDocument d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (!"EN_TRAITEMENT".equals(d.getStatut())) {
            throw new BusinessException("Seules les demandes en traitement peuvent être traitées");
        }
        Employe e = d.getEmploye();
        List<String> lignes = List.of(
                "Nous soussignés, GNS Technologies, attestons que :",
                "",
                e.getNomComplet() + ", matricule " + e.getMatricule() + ",",
                "titulaire du poste de " + (e.getPoste() != null ? e.getPoste().getNom() : "—")
                        + " au sein du département " + (e.getDepartement() != null ? e.getDepartement().getNom() : "—") + ",",
                "est employé(e) par la société depuis le " + e.getDateEmbauche() + ".",
                "",
                "La présente attestation " + (d.getTypeDocument().getDescription() != null
                        ? d.getTypeDocument().getDescription() : "est délivrée à la demande de l'intéressé(e)")
                        + " et ne vaut que pour l'usage auquel elle est destinée."
        );
        String titre = d.getTypeDocument().getNom() + " — " + e.getNomComplet();
        String pied = "Fait à Casablanca, le " + LocalDate.now() + " · GNS TECHNOLOGIES";
        String dateSignature = LocalDateTime.now().toString().replace("T", " ").substring(0, 16);

        byte[] pdf = PdfGenerator.generate("GNS TECHNOLOGIES", titre, lignes, pied, acteur, dateSignature);
        String nomFichier = d.getReference() + ".pdf";
        try {
            Files.createDirectories(uploadDir);
            Files.write(uploadDir.resolve(nomFichier), pdf);
        } catch (IOException ex) {
            throw new BusinessException("Impossible de générer le document");
        }

        d.setStatut("DISPONIBLE");
        d.setFichierUrl("/uploads/documents/" + nomFichier);
        d.setDateTraitement(LocalDateTime.now());
        d.setSignataire(acteur);
        d.setDateSignature(LocalDateTime.now());
        DemandeDocument saved = demandeRepository.save(d);

        notificationService.notifier(e,
                "Votre document « " + d.getTypeDocument().getNom() + " » (" + saved.getReference() + ") est disponible",
                "DOCUMENT_DISPONIBLE");
        auditService.log(acteur, "TRAITEMENT_DOCUMENT", "Document " + saved.getReference() + " généré");
        return toResponse(saved);
    }

    @Transactional
    public DemandeDocumentResponse refuser(Long id, String motif, String acteur) {
        if (motif == null || motif.isBlank()) {
            throw new BusinessException("Le motif de refus est obligatoire");
        }
        DemandeDocument d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (!"EN_TRAITEMENT".equals(d.getStatut())) {
            throw new BusinessException("Seules les demandes en traitement peuvent être refusées");
        }
        d.setStatut("REFUSE");
        d.setMotifRefus(motif);
        d.setDateTraitement(LocalDateTime.now());
        DemandeDocument saved = demandeRepository.save(d);

        notificationService.notifier(d.getEmploye(),
                "Votre demande de document « " + d.getTypeDocument().getNom() + " » a été refusée : " + motif,
                "DOCUMENT_REFUSE");
        auditService.log(acteur, "REFUS_DOCUMENT", "Demande " + saved.getReference() + " refusée");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public DemandeDocument verifierAcces(Long id, AuthUser user) {
        DemandeDocument d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (!user.isRh() && !d.getEmploye().getId().equals(user.employeId())) {
            throw new BusinessException("Vous n'avez pas accès à cette demande");
        }
        return d;
    }

    @Transactional(readOnly = true)
    public byte[] lireFichier(DemandeDocument d) {
        if (d.getFichierUrl() == null) {
            throw new BusinessException("Document pas encore disponible");
        }
        try {
            String nomFichier = d.getReference() + ".pdf";
            return Files.readAllBytes(uploadDir.resolve(nomFichier));
        } catch (IOException ex) {
            throw new BusinessException("Fichier introuvable sur le serveur");
        }
    }

    public String nomFichier(DemandeDocument d) {
        return d.getReference() + ".pdf";
    }

    private DemandeDocumentResponse toResponse(DemandeDocument d) {
        return new DemandeDocumentResponse(
                d.getId(),
                d.getReference(),
                d.getEmploye().getId(),
                d.getEmploye().getNomComplet(),
                d.getEmploye().getInitiales(),
                d.getEmploye().getDepartement() != null ? d.getEmploye().getDepartement().getNom() : null,
                d.getTypeDocument().getId(),
                d.getTypeDocument().getNom(),
                d.getFormat(),
                d.getDateDemande(),
                d.getStatut(),
                d.getMotifRefus(),
                d.getRemarque(),
                d.getFichierUrl() != null,
                d.getFichierUrl() != null ? d.getReference() + ".pdf" : null,
                d.getSignataire(),
                d.getDateSignature()
        );
    }
}
