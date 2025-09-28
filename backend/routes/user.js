const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const { cacheUser, getCachedUser, cacheUserPosts, getCachedUserPosts, clearUserCache } = require('../utils/cache');


// GET /api/user/profile - Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Try to get from cache first
    const cachedUser = await getCachedUser(req.user.id);
    
    if (cachedUser) {
      console.log('✅ Serving user from cache');
      return res.json({
        success: true,
        data: { user: cachedUser },
        cached: true
      });
    }

    // Fetch from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    // Cache the result
    await cacheUser(req.user.id, user, 3600); // Cache for 1 hour

    console.log('✅ Serving user from database');
    res.json({
      success: true,
      data: { user },
      cached: false
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || req.user.name,
        bio: bio !== undefined ? bio : req.user.bio
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        profilePic: true,
        updatedAt: true
      }
    });

    // Clear and update cache
    await clearUserCache(req.user.id);
    await cacheUser(req.user.id, updatedUser, 3600);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});
module.exports = router;