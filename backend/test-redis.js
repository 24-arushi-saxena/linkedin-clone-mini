const redis = require('redis');
require('dotenv').config();
const client = redis.createClient({ url: process.env.REDIS_URL });
async function testRedis() {
  try {
    await client.connect();
    await client.set('test_key', 'Hello from Redis!');
    const value = await client.get('test_key');
    console.log('Value:', value); // Should print "Hello from Redis!"
  } catch (error) {
    console.error('Redis failed:', error);
  } finally {
    await client.disconnect();
  }
}
testRedis();