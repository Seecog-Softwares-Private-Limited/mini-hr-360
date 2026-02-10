// src/services/notification.service.js
// Service for managing user notifications

import { Op } from 'sequelize';
import { Notification, User } from '../models/index.js';

/**
 * Create a notification
 */
export const createNotification = async ({
    userId,
    businessId = null,
    type,
    title,
    message = null,
    priority = 'MEDIUM',
    link = null,
    entityType = null,
    entityId = null,
    targetRole = null,
    metadata = null,
    expiresAt = null,
}) => {
    return Notification.create({
        userId,
        businessId,
        type,
        title,
        message,
        priority,
        link,
        entityType,
        entityId,
        targetRole,
        metadata,
        expiresAt,
    });
};

/**
 * Create notifications for all users with a specific role
 */
export const notifyByRole = async ({
    role,
    businessId = null,
    type,
    title,
    message = null,
    priority = 'MEDIUM',
    link = null,
    entityType = null,
    entityId = null,
    metadata = null,
}) => {
    const where = {
        role,
        status: 'active',
    };
    
    const users = await User.findAll({ where });
    
    const notifications = await Promise.all(
        users.map(user =>
            createNotification({
                userId: user.id,
                businessId,
                type,
                title,
                message,
                priority,
                link,
                entityType,
                entityId,
                targetRole: role,
                metadata,
            })
        )
    );
    
    return notifications;
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, options = {}) => {
    const {
        unreadOnly = false,
        limit = 50,
        offset = 0,
        type = null,
        businessId = null,
    } = options;
    
    const where = {
        userId,
        isDismissed: false,
        [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
        ],
    };
    
    if (unreadOnly) {
        where.isRead = false;
    }
    
    if (type) {
        where.type = type;
    }
    
    if (businessId) {
        where.businessId = businessId;
    }
    
    const { rows: notifications, count } = await Notification.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });
    
    return { notifications, count };
};

/**
 * Get unread notification count for a user
 * Returns 0 if notifications table does not exist (e.g. before migrations run).
 */
export const getUnreadCount = async (userId, businessId = null) => {
    const where = {
        userId,
        isRead: false,
        isDismissed: false,
        [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
        ],
    };
    if (businessId) {
        where.businessId = businessId;
    }
    try {
        return await Notification.count({ where });
    } catch (err) {
        const msg = (err && err.message) ? err.message : '';
        if (msg.includes("doesn't exist") || (err.parent && (err.parent.code === 'ER_NO_SUCH_TABLE'))) {
            return 0;
        }
        throw err;
    }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId, userId) => {
    const notification = await Notification.findOne({
        where: { id: notificationId, userId },
    });
    
    if (!notification) return null;
    
    await notification.update({
        isRead: true,
        readAt: new Date(),
    });
    
    return notification;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId, businessId = null) => {
    const where = {
        userId,
        isRead: false,
    };
    
    if (businessId) {
        where.businessId = businessId;
    }
    
    const [count] = await Notification.update(
        { isRead: true, readAt: new Date() },
        { where }
    );
    
    return count;
};

/**
 * Dismiss a notification
 */
export const dismissNotification = async (notificationId, userId) => {
    const notification = await Notification.findOne({
        where: { id: notificationId, userId },
    });
    
    if (!notification) return null;
    
    await notification.update({ isDismissed: true });
    
    return notification;
};

/**
 * Delete old notifications (cleanup job)
 */
export const cleanupOldNotifications = async (daysOld = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const deleted = await Notification.destroy({
        where: {
            createdAt: { [Op.lt]: cutoffDate },
            isRead: true,
        },
    });
    
    return deleted;
};

/**
 * Get notifications by entity (e.g., all notifications for a specific PayrollRun)
 */
export const getNotificationsByEntity = async (entityType, entityId) => {
    return Notification.findAll({
        where: { entityType, entityId },
        order: [['createdAt', 'DESC']],
    });
};

/**
 * Delete notifications for an entity (when entity is deleted)
 */
export const deleteNotificationsForEntity = async (entityType, entityId) => {
    return Notification.destroy({
        where: { entityType, entityId },
    });
};

export default {
    createNotification,
    notifyByRole,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    cleanupOldNotifications,
    getNotificationsByEntity,
    deleteNotificationsForEntity,
};
