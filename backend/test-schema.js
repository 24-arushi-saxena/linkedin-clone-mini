const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSchema() {
  try {
    console.log('Testing new schema with all fields...\n');
    
    // Test 1: User creation with all fields
    console.log('1. Creating test user with all profile fields...');
    const user = await prisma.user.create({
      data: {
        email: 'schematest@example.com',
        username: 'schematest',
        firstName: 'Schema',
        lastName: 'Test',
        password: 'temppassword123',
        bio: 'Test bio for schema validation',
        profilePic: 'https://example.com/pic.jpg',
        avatar: 'https://example.com/avatar.jpg',
        location: 'Test City',
        website: 'https://schematest.com'
      }
    });
    console.log('User created successfully:');
    console.log({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      location: user.location,
      website: user.website
    });

    // Test 2: Post creation with user relationship
    console.log('\n2. Creating test post with author relationship...');
    const post = await prisma.post.create({
      data: {
        content: 'My first post with the new schema!',
        imageUrl: 'https://example.com/post-image.jpg',
        authorId: user.id,
        likes: 5
      }
    });
    console.log('Post created successfully:');
    console.log({
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      authorId: post.authorId,
      likes: post.likes
    });

    // Test 3: Fetching user with posts (relationship test)
    console.log('\n3. Testing user-post relationship...');
    const userWithPosts = await prisma.user.findUnique({
      where: { id: user.id },
      include: { posts: true }
    });
    console.log('User with posts fetched successfully:');
    console.log({
      username: userWithPosts.username,
      postsCount: userWithPosts.posts.length,
      posts: userWithPosts.posts.map(p => ({
        id: p.id,
        content: p.content,
        likes: p.likes
      }))
    });

    // Test 4: Update user profile
    console.log('\n4. Testing profile update...');
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        bio: 'Updated bio through schema test',
        location: 'Updated City'
      }
    });
    console.log('User updated successfully:');
    console.log({
      bio: updatedUser.bio,
      location: updatedUser.location,
      updatedAt: updatedUser.updatedAt
    });

    // Test 5: Query with all fields
    console.log('\n5. Testing query with selective field retrieval...');
    const userFields = await prisma.user.findUnique({
      where: { id: user.id },
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
        // Note: password is intentionally excluded
      }
    });
    console.log('All fields retrieved successfully (excluding password)');

    // Cleanup
    console.log('\n6. Cleaning up test data...');
    await prisma.post.deleteMany({ where: { authorId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Test data cleaned up');

    console.log('\nSchema test successful! All fields and relationships working correctly.');

  } catch (error) {
    console.error('Schema test failed:', error.message);
    if (error.code) {
      console.error('Prisma error code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testSchema();