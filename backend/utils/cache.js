const redis = require('redis');
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

// Cache user data
async function cacheUser(userId, userData, ttl = 3600) {
  await connectRedis();
  const key = `user:${userId}`;
  await redisClient.setEx(key, ttl, JSON.stringify(userData));
}

// Get cached user
async function getCachedUser(userId) {
  await connectRedis();
  const key = `user:${userId}`;
  const cached = await redisClient.get(key);
  return cached ? JSON.parse(cached) : null;
}

// Cache user posts
async function cacheUserPosts(userId, posts, ttl = 1800) {
  await connectRedis();
  const key = `user_posts:${userId}`;
  await redisClient.setEx(key, ttl, JSON.stringify(posts));
}

// Get cached posts
async function getCachedUserPosts(userId) {
  await connectRedis();
  const key = `user_posts:${userId}`;
  const cached = await redisClient.get(key);
  return cached ? JSON.parse(cached) : null;
}

// Clear user cache
async function clearUserCache(userId) {
  await connectRedis();
  const userKey = `user:${userId}`;
  const postsKey = `user_posts:${userId}`;
  await redisClient.del([userKey, postsKey]);
}

module.exports = {
  cacheUser,
  getCachedUser,
  cacheUserPosts,
  getCachedUserPosts,
  clearUserCache
};