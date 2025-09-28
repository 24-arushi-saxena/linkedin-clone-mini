const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSchema() {
  try {
    console.log('Testing new schema...');
    
    // Test user creation
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'temppassword',
        bio: 'Test bio'
      }
    });
    console.log('User created:', user);

    // Test post creation with user relationship
    const post = await prisma.post.create({
      data: {
        content: 'My first post!',
        authorId: user.id
      }
    });
    console.log('Post created:', post);

    // Test fetching user with posts
    const userWithPosts = await prisma.user.findUnique({
      where: { id: user.id },
      include: { posts: true }
    });
    console.log('User with posts:', userWithPosts);

    // Cleanup
    await prisma.post.delete({ where: { id: post.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Schema test successful!');

  } catch (error) {
    console.error('Schema test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchema();