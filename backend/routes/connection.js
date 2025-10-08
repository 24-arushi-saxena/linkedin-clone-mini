const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/connections/request - Send connection request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    // Validation
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    // Can't connect to yourself
    if (senderId === parseInt(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send connection request to yourself'
      });
    }

    // Check if receiver exists
    const receiverExists = await prisma.user.findUnique({
      where: { id: parseInt(receiverId) }
    });

    if (!receiverExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for existing connection (either direction)
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId, receiverId: parseInt(receiverId) },
          { senderId: parseInt(receiverId), receiverId: senderId }
        ]
      }
    });

    if (existingConnection) {
      if (existingConnection.status === 'ACCEPTED') {
        return res.status(400).json({
          success: false,
          message: 'Already connected with this user'
        });
      }
      if (existingConnection.status === 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Connection request already pending'
        });
      }
    }

    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        senderId,
        receiverId: parseInt(receiverId),
        status: 'PENDING'
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePic: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Connection request sent',
      data: { connection }
    });

  } catch (error) {
    console.error('Send connection request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send connection request'
    });
  }
});

// GET /api/connections/requests - Get received connection requests
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.connection.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePic: true,
            bio: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        requests,
        count: requests.length
      }
    });

  } catch (error) {
    console.error('Get connection requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connection requests'
    });
  }
});

// PUT /api/connections/:id/accept - Accept connection request
router.put('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id);

    // Find the connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    // Only receiver can accept
    if (connection.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept requests sent to you'
      });
    }

    // Must be pending
    if (connection.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Connection request is not pending'
      });
    }

    // Accept the connection
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ACCEPTED' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Connection accepted',
      data: { connection: updatedConnection }
    });

  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept connection'
    });
  }
});

// PUT /api/connections/:id/reject - Reject connection request
router.put('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id);

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    // Only receiver can reject
    if (connection.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject requests sent to you'
      });
    }

    if (connection.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Connection request is not pending'
      });
    }

    // Reject the connection
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'REJECTED' }
    });

    res.json({
      success: true,
      message: 'Connection rejected',
      data: { connection: updatedConnection }
    });

  } catch (error) {
    console.error('Reject connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject connection'
    });
  }
});

// GET /api/connections - Get all my connections
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all accepted connections where user is sender OR receiver
    const connections = await prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePic: true,
            bio: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePic: true,
            bio: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform data to show "the other person"
    const transformedConnections = connections.map(conn => {
      const connectedUser = conn.senderId === userId ? conn.receiver : conn.sender;
      return {
        id: conn.id,
        connectedUser,
        connectedAt: conn.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        connections: transformedConnections,
        count: transformedConnections.length
      }
    });

  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connections'
    });
  }
});

// DELETE /api/connections/:id - Remove connection
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id);

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }

    // Only parties involved can remove
    if (connection.senderId !== userId && connection.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove your own connections'
      });
    }

    // Delete the connection
    await prisma.connection.delete({
      where: { id: connectionId }
    });

    res.json({
      success: true,
      message: 'Connection removed'
    });

  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove connection'
    });
  }
});

module.exports = router;