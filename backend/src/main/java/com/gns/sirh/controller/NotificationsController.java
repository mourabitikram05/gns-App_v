package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.NotificationDto;
import com.gns.sirh.service.NotificationService;
import com.gns.sirh.service.SecurityUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationsController {

    private final NotificationService notificationService;

    public NotificationsController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> lister() {
        Long employeId = SecurityUtils.currentUser().employeId();
        List<NotificationDto> items = employeId != null
                ? notificationService.top(employeId, 10) : List.of();
        long nonLues = employeId != null ? notificationService.countNonLues(employeId) : 0;
        return ApiResponse.success(Map.of("count", nonLues, "items", items));
    }

    @PutMapping("/lire")
    public ApiResponse<Integer> marquerToutesLues() {
        Long employeId = SecurityUtils.currentUser().employeId();
        int lues = employeId != null ? notificationService.marquerToutesLues(employeId) : 0;
        return ApiResponse.success("Notifications marquées comme lues", lues);
    }

    @PutMapping("/{id}/lue")
    public ApiResponse<Void> marquerLue(@PathVariable Long id) {
        Long employeId = SecurityUtils.currentUser().employeId();
        if (employeId != null) {
            notificationService.marquerLue(id, employeId);
        }
        return ApiResponse.success("Notification lue", null);
    }
}
