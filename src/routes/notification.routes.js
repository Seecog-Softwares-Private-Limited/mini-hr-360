// src/routes/notification.routes.js
// API routes for notifications

import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyUser } from '../middleware/authMiddleware.js';
import * as notificationService from '../services/notification.service.js';

const router = express.Router();

// Apply authentication to all notification routes
router.use(verifyUser);

/**
 * Get notifications for the current user
 * GET /api/v1/notifications
 */
router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { unreadOnly, limit, offset, type, businessId } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        type: type || null,
        businessId: businessId ? parseInt(businessId) : null,
    });

    return res.json(new ApiResponse(200, result));
}));

/**
 * Get unread notification count
 * GET /api/v1/notifications/count
 */
router.get('/count', asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const businessId = req.query.businessId ? parseInt(req.query.businessId) : null;

    const count = await notificationService.getUnreadCount(userId, businessId);

    return res.json(new ApiResponse(200, { count }));
}));

/**
 * Mark a notification as read
 * PUT /api/v1/notifications/:id/read
 */
router.put('/:id/read', asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const notificationId = parseInt(req.params.id);

    const notification = await notificationService.markAsRead(notificationId, userId);

    if (!notification) {
        throw new ApiError(404, 'Notification not found');
    }

    return res.json(new ApiResponse(200, notification, 'Notification marked as read'));
}));

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
router.put('/read-all', asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const businessId = req.query.businessId ? parseInt(req.query.businessId) : null;

    const count = await notificationService.markAllAsRead(userId, businessId);

    return res.json(new ApiResponse(200, { count }, `${count} notifications marked as read`));
}));

/**
 * Dismiss a notification
 * DELETE /api/v1/notifications/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const notificationId = parseInt(req.params.id);

    const notification = await notificationService.dismissNotification(notificationId, userId);

    if (!notification) {
        throw new ApiError(404, 'Notification not found');
    }

    return res.json(new ApiResponse(200, { id: notificationId }, 'Notification dismissed'));
}));

export default router;
