const express = require('express');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { signupValidation, loginValidation, handleValidationErrors } = require('../utils/validation');
const { storeSession, deleteSession } = require('../utils/session');

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, message: 'Too many attempts, try again later' }
});

// POST /api/auth/signup
router.post('/signup', authLimiter, signupValidation, handleValidationErrors, async (req, res) => {
  try {
    const { 
      email, 
      username, 
      firstName, 
      lastName, 
      password, 
      bio,
      profilePic,
      avatar,
      location,
      website
    } = req.body;

    // Check if user already exists (email or username)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: username || email.split('@')[0] }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with all fields
    const user = await prisma.user.create({
      data: {
        email,
        username: username || email.split('@')[0], // Use provided username or generate from email
        firstName: firstName || null,
        lastName: lastName || null,
        password: hashedPassword,
        bio: bio || null,
        profilePic: profilePic || null,
        avatar: avatar || null,
        location: location || null,
        website: website || null
      },
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

    // Generate token
    const token = generateToken(user.id);

    // Store session in Redis
    await storeSession(user.id, token);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with all profile fields
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        password: true,
        bio: true,
        profilePic: true,
        avatar: true,
        location: true,
        website: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Store session in Redis
    await storeSession(user.id, token);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const { verifyToken } = require('../utils/auth');
      const decoded = verifyToken(token);
      await deleteSession(decoded.userId);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

module.exports = router;