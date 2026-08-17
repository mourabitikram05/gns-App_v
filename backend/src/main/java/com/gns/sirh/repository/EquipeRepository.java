package com.gns.sirh.repository;

import com.gns.sirh.entity.Equipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EquipeRepository extends JpaRepository<Equipe, Long> {

    List<Equipe> findAllByOrderByNomAsc();
}
