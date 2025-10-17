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

// Set data in cache with expiration (in seconds)
async function setCache(key, value, expireInSeconds = 3600) {
  try {
    await client.setex(key, expireInSeconds, value);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

// Delete from cache
async function deleteCache(key) {
  try {
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}
module.exports = {
  cacheUser,
  getCachedUser,
  cacheUserPosts,
  getCachedUserPosts,
  clearUserCache,
  setCache,
  deleteCache
};