package com.gns.sirh.controller;

import com.gns.sirh.config.PermissionRequired;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.*;
import com.gns.sirh.service.RecrutementService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/recrutement")
@PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")

public class RecrutementController {

    private final RecrutementService recrutementService;
    private final ObjectMapper objectMapper;

    public RecrutementController(RecrutementService recrutementService, ObjectMapper objectMapper) {
        this.recrutementService = recrutementService;
        this.objectMapper = objectMapper;
    }

    private CandidatRequest parseCandidat(String json) {
        try {
            CandidatRequest req = objectMapper.readValue(json, CandidatRequest.class);
            if (req.offreId() == null || req.nom() == null || req.prenom() == null || req.email() == null) {
                throw new BusinessException("L'offre, le nom et l'email sont obligatoires");
            }
            return req;
        } catch (JsonProcessingException e) {
            throw new BusinessException("Format de candidat invalide");
        }
    }

    @GetMapping("/offres")
    public ApiResponse<List<OffreEmploiDto>> offres() {
        return ApiResponse.success(recrutementService.offres());
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PostMapping("/offres")
    public ApiResponse<OffreEmploiDto> publier(@Valid @RequestBody OffreEmploiRequest request) {
        return ApiResponse.created("Offre publiée",
                recrutementService.publier(request, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/offres/{id}")
    public ApiResponse<OffreEmploiDto> modifierOffre(@PathVariable Long id,
                                                     @Valid @RequestBody OffreEmploiRequest request) {
        return ApiResponse.success("Offre modifiée",
                recrutementService.modifierOffre(id, request, SecurityUtils.currentUser().email()));
    }

    @GetMapping("/offres/{id}/candidatures")
    public ApiResponse<List<CandidatureResponse>> candidatures(@PathVariable Long id) {
        return ApiResponse.success(recrutementService.candidaturesParOffre(id));
    }

    @GetMapping("/candidatures/{id}")
    public ApiResponse<CandidatureResponse> detail(@PathVariable Long id) {
        return ApiResponse.success(recrutementService.detailCandidature(id));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PostMapping("/candidats")
    public ApiResponse<CandidatureResponse> ajouterCandidat(
            @RequestParam("candidat") String candidatJson,
            @RequestPart(value = "cv", required = false) MultipartFile cv,
            @RequestPart(value = "lettre", required = false) MultipartFile lettre) {
        CandidatRequest req = parseCandidat(candidatJson);
        return ApiResponse.created("Candidature enregistrée",
                recrutementService.ajouterCandidat(req, cv, lettre, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/candidatures/{id}/etape")
    public ApiResponse<CandidatureResponse> changerEtape(@PathVariable Long id,
                                                         @Valid @RequestBody EtapeRequest request) {
        return ApiResponse.success("Étape mise à jour",
                recrutementService.changerEtape(id, request.etape(), SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/candidatures/{id}/entretien")
    public ApiResponse<CandidatureResponse> planifierEntretien(@PathVariable Long id,
                                                               @Valid @RequestBody EntretienRequest request) {
        return ApiResponse.success("Entretien planifié",
                recrutementService.planifierEntretien(id, request.dateEntretien(), SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PostMapping("/candidatures/{id}/embaucher")
    public ApiResponse<CandidatureResponse> embaucher(@PathVariable Long id) {
        return ApiResponse.success("Candidat embauché — fiche employé créée",
                recrutementService.embaucher(id, SecurityUtils.currentUser().email()));
    }

    @GetMapping("/fichiers/{dossier}/{fileName}")
    public ResponseEntity<byte[]> telechargerFichier(@PathVariable String dossier, @PathVariable String fileName) {
        byte[] contenu = recrutementService.lireFichier(dossier, fileName);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(contenu);
    }
}
