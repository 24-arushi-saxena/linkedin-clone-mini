const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { cacheUser, getCachedUser, cacheUserPosts, getCachedUserPosts, clearUserCache, deleteCache } = require('../utils/cache');

const router = express.Router();
const prisma = new PrismaClient();




// GET /api/user/profile - Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📥 Fetching profile for user ID: ${userId}`);
    
    // Step 1: Try to get from cache first
    const cachedUser = await getCachedUser(userId);
    
    if (cachedUser) {
      console.log('✅ Serving user from cache');
      return res.json({
        success: true,
        data: { user: cachedUser },
        source: 'cache'
      });
    }

    // Step 2: Fetch from database with all profile fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        profilePic: true,
        avatar: true,
        location: true,
        website: true,
        createdAt: true,
        updatedAt: true
        // IMPORTANT: Never include password field
      }
    });

    // Step 3: Handle user not found
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Step 4: Cache the result (expire in 1 hour = 3600 seconds)
    await cacheUser(userId, user, 3600);

    console.log('✅ Serving user from database and cached');
    
    res.json({
      success: true,
      data: { user },
      source: 'database'
    });

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Extract all possible profile fields from request body
    const { 
      username,
      firstName, 
      lastName, 
      bio, 
      profilePic,
      avatar,
      location, 
      website 
    } = req.body;

    console.log(`📝 Updating profile for user ID: ${userId}`);

    // Prepare data object - only include fields that were provided
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;

    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Step 1: Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        profilePic: true,
        avatar: true,
        location: true,
        website: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Step 2: Clear cache and re-cache updated data
    await clearUserCache(userId);
    await cacheUser(userId, updatedUser, 3600);

    console.log('✅ Profile updated and cache refreshed');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    
    // Handle Prisma unique constraint violations (duplicate username/email)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `This ${field} is already taken`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;