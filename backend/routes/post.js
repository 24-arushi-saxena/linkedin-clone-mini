// backend/routes/post.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/posts - Create a new post
router.post('/', 
  authenticateToken, // Only logged-in users
  [
    // Validation rules
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Content must be between 1-5000 characters'),
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Image URL must be valid')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { content, imageUrl } = req.body;
      const userId = req.user.id; // From auth middleware

      console.log(`Creating post for user ${userId}`);

      // Create post in database
      const post = await prisma.post.create({
        data: {
          content,
          imageUrl: imageUrl || null,
          authorId: userId
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePic: true,
              avatar: true
            }
          }
        }
      });

      console.log('Post created successfully');

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: { post }
      });

    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create post'
      });
    }
  }
);

// GET /api/posts - Get all posts (feed)
router.get('/', async (req, res) => {
  try {
    // Optional: pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log(`Fetching posts: page ${page}, limit ${limit}`);

    // Fetch posts with author info
    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc' // Newest first
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePic: true,
            avatar: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalPosts = await prisma.post.count();

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: totalPosts,
          totalPages: Math.ceil(totalPosts / limit)
        }
      }
    });

  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts'
    });
  }
});

// GET /api/posts/:id - Get single post by ID
router.get('/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    console.log(`Fetching post ${postId}`);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePic: true,
            avatar: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: { post }
    });

  } catch (error) {
    console.error('Fetch single post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post'
    });
  }
});

// PUT /api/posts/:id - Update a post
router.put('/:id',
  authenticateToken,
  [
    body('content')
      .optional()
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Content must be between 1-5000 characters'),
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Image URL must be valid')
  ],
  async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.id;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post ID'
        });
      }

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      console.log(`User ${userId} attempting to update post ${postId}`);

      // Step 1: Check if post exists
      const existingPost = await prisma.post.findUnique({
        where: { id: postId }
      });

      if (!existingPost) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Step 2: Check ownership
      if (existingPost.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own posts'
        });
      }

      // Step 3: Prepare update data
      const { content, imageUrl } = req.body;
      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      // Step 4: Update the post
      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePic: true,
              avatar: true
            }
          }
        }
      });

      console.log('Post updated successfully');

      res.json({
        success: true,
        message: 'Post updated successfully',
        data: { post: updatedPost }
      });

    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update post'
      });
    }
  }
);

// DELETE /api/posts/:id - Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    console.log(`User ${userId} attempting to delete post ${postId}`);

    // Step 1: Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Step 2: Check ownership
    if (existingPost.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    // Step 3: Delete the post
    await prisma.post.delete({
      where: { id: postId }
    });

    console.log('Post deleted successfully');

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

module.exports = router;