package com.gns.sirh.dto;

public record AuthResponse(
        String token,
        String email,
        String role,
        Long employeId,
        String prenom,
        String nom,
        String nomComplet,
        String matricule
) {
}
