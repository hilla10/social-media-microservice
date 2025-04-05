const Post = require('../models/post');
const logger = require('../utils/logger');
const { validateCreatePost } = require('../utils/validation');
const {publishEvent} = require('../utils/rabbitmq')

async function invalidatePostCatch(req, input) {
  const catchKey = `post:${input}`;
  await req.redisClient.del(catchKey);
  const keys = await req.redisClient.keys('posts:*');
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info('Create post endpoint hit');
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIds } = req.body;

    const newlyCreatedPost = new Post({
      user: req.user,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();

    await publishEvent('post.created', {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt
    });
    

    await invalidatePostCatch(req, newlyCreatedPost._id.toString());
    logger.info('Post created successfully', newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
    });
  } catch (e) {
    logger.error('Error creating post', e);
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const catchKey = `posts:${page}:${limit}`;
    const catchPosts = await req.redisClient.get(catchKey);

    if (catchPosts) {
      return res.json(JSON.parse(catchPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNumberOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNumberOfPosts / limit),
      totalPosts: totalNumberOfPosts,
    };

    // save your post in redis catch
    await req.redisClient.setex(catchKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (e) {
    logger.error('Error fetching post', e);
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
    });
  }
};

const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const catchKey = `post:${postId}`;

    const catchPost = await req.redisClient.get(catchKey);

    if (catchPost) {
      return res.json(JSON.parse(catchPost));
    }

    const postById = await Post.findById(postId);

    if (!postById) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await req.redisClient.setex(catchPost, 3600, JSON.stringify(postById));

    return res.json(postById);
  } catch (e) {
    logger.error('Error fetching post', e);
    res.status(500).json({
      success: false,
      message: 'Error fetching post by Id',
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findOneAndDelete({
      _id: postId,
      user: req.user,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // publish post delete method ->
    await publishEvent('post.deleted', {
      postId: post._id.toString(),
      userId: req.user,
      mediaIds: post.mediaIds
    });

    await invalidatePostCatch(req, postId);
    res.json({
      success: true,
      message: 'post deleted successfully',
    });
  } catch (e) {
    logger.error('Error delete post', e);
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'Error delete post',
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };
