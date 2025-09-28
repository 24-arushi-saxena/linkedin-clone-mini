const redis = require('redis');
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

// Connect to Redis
async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

// Store user session
async function storeSession(userId, token) {
  await connectRedis();
  const sessionKey = `session:${userId}`;
  const sessionData = JSON.stringify({
    userId,
    token,
    loginTime: new Date().toISOString()
  });
  
  // Store for 24 hours (86400 seconds)
  await redisClient.setEx(sessionKey, 86400, sessionData);
}

// Get user session
async function getSession(userId) {
  await connectRedis();
  const sessionKey = `session:${userId}`;
  const sessionData = await redisClient.get(sessionKey);
  return sessionData ? JSON.parse(sessionData) : null;
}

// Delete user session (logout)
async function deleteSession(userId) {
  await connectRedis();
  const sessionKey = `session:${userId}`;
  await redisClient.del(sessionKey);
}

module.exports = {
  storeSession,
  getSession,
  deleteSession
};