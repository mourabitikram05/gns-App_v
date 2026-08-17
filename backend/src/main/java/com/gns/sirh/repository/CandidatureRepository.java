package com.gns.sirh.repository;

import com.gns.sirh.entity.Candidature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CandidatureRepository extends JpaRepository<Candidature, Long> {

    List<Candidature> findByOffreIdOrderByDateCreationDesc(Long offreId);

    List<Candidature> findAllByOrderByDateCreationDesc();

    long countByOffreId(Long offreId);
}
