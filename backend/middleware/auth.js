const { verifyToken } = require('../utils/auth');
const { getSession } = require('../utils/session');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Verify JWT token middleware
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify JWT
    const decoded = verifyToken(token);
    
    // Check if session exists in Redis
    const session = await getSession(decoded.userId);
    if (!session || session.token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Get user from database with all profile fields
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        // role: true, 
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

// Optional authentication (doesn't fail if no token)
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const session = await getSession(decoded.userId);
      
      if (session && session.token === token) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
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
            // role: true, 
            createdAt: true,
            updatedAt: true
          }
        });
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

module.exports = {
  authenticateToken,
  optionalAuth
};