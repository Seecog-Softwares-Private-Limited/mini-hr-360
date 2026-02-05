import express from 'express';
import { loginUser, logoutUser } from '../controllers/user/login.js';
import register from '../controllers/user/register.js';
import { verifyUser } from '../middleware/authMiddleware.js';
import { refresh } from '../controllers/user/refreshToken.js';
import { checkEmail } from '../controllers/user/checkEmail.js';
import { User } from '../models/User.js';


const router = express.Router();

router.post('/register', register);
router.get('/check-email', checkEmail);
router.post('/login', loginUser);
router.post("/refresh", refresh);
router.post('/logout', verifyUser, logoutUser);

// Get all users (admin only) - for approval workflow user selection
router.get('/', verifyUser, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'status'],
      order: [['firstName', 'ASC']],
    });
    
    // Format response
    const formattedUsers = users.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
    
    res.json({ data: formattedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (admin only)
router.put('/:id/role', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['admin', 'shop_owner', 'shop_manager', 'shop_worker', 'SUPER_ADMIN', 'HR_MANAGER', 'HR_EXECUTIVE', 'FINANCE', 'MANAGER', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update({ role });
    
    res.json({ 
      message: 'Role updated successfully',
      data: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;