import express from 'express';
import { loginUser, logoutUser } from '../controllers/user/login.js';
import register from '../controllers/user/register.js';
import { verifyUser } from '../middleware/authMiddleware.js';
import { refresh } from '../controllers/user/refreshToken.js';
import { checkEmail } from '../controllers/user/checkEmail.js';
import { User } from '../models/User.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { Business } from '../models/Business.js';
import {
  isPlatformAdmin,
  ORG_ASSIGNABLE_ROLES,
  resolveOrganizationIdFromRequest,
  listUsersForRequest,
  userBelongsToOrganization,
  userCanManageOrganizationRoles,
  formatUserSummary,
} from '../services/organization.service.js';


const router = express.Router();

const ALL_ASSIGNABLE_ROLES = [
  'admin',
  'shop_owner',
  'shop_manager',
  'shop_worker',
  'SUPER_ADMIN',
  ...ORG_ASSIGNABLE_ROLES,
];

router.post('/register', register);
router.get('/check-email', checkEmail);
router.post('/login', loginUser);
router.post("/refresh", refresh);
router.post('/logout', verifyUser, logoutUser);

// List users: platform admins see everyone; org owners see only their organization.
router.get('/', verifyUser, async (req, res) => {
  try {
    const formattedUsers = await listUsersForRequest(req);
    res.json({ data: formattedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role: scoped to organization unless platform admin.
router.put('/:id/role', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const targetUserId = Number(id);

    const allowedRoles = isPlatformAdmin(req.user)
      ? ALL_ASSIGNABLE_ROLES
      : ORG_ASSIGNABLE_ROLES;

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role for your access level' });
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!isPlatformAdmin(req.user)) {
      const organizationId = await resolveOrganizationIdFromRequest(req);
      if (!organizationId) {
        return res.status(403).json({ error: 'No organization context found' });
      }

      const canManage = await userCanManageOrganizationRoles(req.user, organizationId);
      if (!canManage) {
        return res.status(403).json({ error: 'Only the organization owner can change roles' });
      }

      const inOrganization = await userBelongsToOrganization(targetUserId, organizationId);
      if (!inOrganization) {
        return res.status(403).json({ error: 'You can only update users in your organization' });
      }

      if (isPlatformAdmin(user)) {
        return res.status(403).json({ error: 'You cannot change this user role' });
      }

      // In organization scope, role is membership-scoped, not global user role.
      const membership = await OrganizationMember.findOne({
        where: { userId: targetUserId, businessId: organizationId, status: 'active' },
      });
      if (!membership) {
        return res.status(404).json({ error: 'Organization membership not found' });
      }
      const organization = await Business.findByPk(organizationId, { attributes: ['ownerId'] });
      if (Number(targetUserId) === Number(organization?.ownerId)) {
        return res.status(403).json({ error: 'Owner role cannot be changed' });
      }
      await membership.update({ role });

      return res.json({
        message: 'Role updated successfully',
        data: formatUserSummary({
          ...user.toJSON(),
          organizationRole: membership.role,
          isOrganizationOwner: false,
        }),
      });
    }

    await user.update({ role });

    res.json({
      message: 'Role updated successfully',
      data: formatUserSummary(user),
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
