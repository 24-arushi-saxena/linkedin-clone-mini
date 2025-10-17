const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const redis = require('redis');
const postRoutes = require('./routes/post');
const connectionRoutes = require('./routes/connection');
const adminRoutes = require('./routes/admin');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const prisma = new PrismaClient();

app.use(helmet());

// Create Redis client but don't connect immediately
let redisClient;

// Initialize Redis client with error handling
async function initializeRedis() {
  try {
    redisClient = redis.createClient({ 
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });
    
    redisClient.on('error', (err) => {
      console.log('Redis Client Error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });
    
    await redisClient.connect();
    console.log('Redis initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Redis:', error.message);
    redisClient = null;
  }
}
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/admin', adminRoutes);


// Test route with improved error handling
app.get('/test', async (req, res) => {
  console.log('Test route accessed');
  let prismaConnected = false;
  let redisConnected = false;
  let users = [];
  let redisValue = null;
  let errors = [];

  // Test PostgreSQL connection
  try {
    console.log('Testing PostgreSQL connection...');
    await prisma.$connect();
    users = await prisma.user.findMany();
    prismaConnected = true;
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.error('PostgreSQL Error:', error.message);
    errors.push(`PostgreSQL: ${error.message}`);
  }

  // Test Redis connection
  try {
    console.log('Testing Redis connection...');
    if (redisClient && redisClient.isOpen) {
      await redisClient.set('test', 'Redis works!');
      redisValue = await redisClient.get('test');
      redisConnected = true;
      console.log('Redis connected successfully');
    } else {
      throw new Error('Redis client not initialized or not connected');
    }
  } catch (error) {
    console.error('Redis Error:', error.message);
    errors.push(`Redis: ${error.message}`);
  }

  // Send response
  const response = {
    message: 'Connection Test Results',
    postgresql: {
      connected: prismaConnected,
      users: users,
      userCount: users.length
    },
    redis: {
      connected: redisConnected,
      testValue: redisValue
    },
    errors: errors.length > 0 ? errors : 'No errors'
  };

  console.log('Sending response:', JSON.stringify(response, null, 2));

  if (errors.length > 0) {
    res.status(500).json(response);
  } else {
    res.json(response);
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    port: 5000 
  });
});

// Initialize server
async function startServer() {
  try {
    console.log('Starting server...');
    
    // Initialize Redis first
    await initializeRedis();
    
    // Test Prisma connection
    console.log('Testing Prisma connection...');
    await prisma.$connect();
    console.log('Prisma connected successfully');
    
    // Start server
    app.listen(5000, () => {
      console.log('✅ Server running on port 5000');
      console.log('✅ Visit: http://localhost:5000/health');
      console.log('✅ Test connections: http://localhost:5000/test');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  if (redisClient) {
    await redisClient.disconnect();
  }
  process.exit(0);
});

//Add error handling middleware:
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// Start the server
startServer();