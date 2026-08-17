package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.UtilisateurDto;
import com.gns.sirh.dto.UtilisateurRequest;
import com.gns.sirh.dto.UtilisateurUpdateRequest;
import com.gns.sirh.entity.AuditLog;
import com.gns.sirh.entity.Permission;
import com.gns.sirh.repository.AuditLogRepository;
import com.gns.sirh.service.PermissionService;
import com.gns.sirh.service.SecuriteService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/securite")
@PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
public class SecuriteController {

    private final PermissionService permissionService;
    private final SecuriteService securiteService;
    private final AuditLogRepository auditLogRepository;

    public SecuriteController(PermissionService permissionService,
                              SecuriteService securiteService,
                              AuditLogRepository auditLogRepository) {
        this.permissionService = permissionService;
        this.securiteService = securiteService;
        this.auditLogRepository = auditLogRepository;
    }

    // ---------------- Matrice de permissions ----------------

    @GetMapping("/permissions")
    public ApiResponse<List<Permission>> permissions() {
        return ApiResponse.success(permissionService.toutesLesPermissions());
    }

    @GetMapping("/roles")
    public ApiResponse<Map<String, List<String>>> roles() {
        return ApiResponse.success(permissionService.rolesAvecPermissions());
    }

    @PutMapping("/roles/{role}/permissions")
    public ApiResponse<Map<String, List<String>>> majPermissions(@PathVariable String role,
                                                                 @RequestBody List<String> codes) {
        return ApiResponse.success("Permissions mises à jour",
                permissionService.majPermissions(role.toUpperCase(), codes));
    }

    // ---------------- Utilisateurs ----------------

    @GetMapping("/utilisateurs")
    public ApiResponse<List<UtilisateurDto>> utilisateurs() {
        return ApiResponse.success(securiteService.lister());
    }

    @PostMapping("/utilisateurs")
    public ApiResponse<UtilisateurDto> creerUtilisateur(@Valid @RequestBody UtilisateurRequest request) {
        return ApiResponse.created("Compte créé",
                securiteService.creer(request, SecurityUtils.currentUser().email()));
    }

    @PutMapping("/utilisateurs/{id}")
    public ApiResponse<UtilisateurDto> modifierUtilisateur(@PathVariable Long id,
                                                           @RequestBody UtilisateurUpdateRequest request) {
        return ApiResponse.success("Compte modifié",
                securiteService.modifier(id, request, SecurityUtils.currentUser().email()));
    }

    // ---------------- Journal d'audit ----------------

    @GetMapping("/audit")
    public ApiResponse<List<AuditLog>> audit() {
        return ApiResponse.success(auditLogRepository.findAllByOrderByDateActionDesc());
    }

    @GetMapping("/audit/export")
    public ResponseEntity<byte[]> exportAudit() {
        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF').append("sep=;\n");
        sb.append("Acteur;Action;Détail;Date\n");
        for (AuditLog l : auditLogRepository.findAllByOrderByDateActionDesc()) {
            sb.append(v(l.getActeur())).append(';').append(v(l.getAction())).append(';')
                    .append(v(l.getDetail())).append(';').append(l.getDateAction()).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"journal_audit.csv\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private String v(String s) {
        return s == null ? "" : s.replace(";", ",");
    }
}
