require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('./utils/logger');
const proxy = require('express-http-proxy');
const errorHandler = require('../src/middleware/errorHandler');
const { validateToken } = require('./middleware/authMiddleware');

const app = express();
const port = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

// rate limiting
const RateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for Id: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests',
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(RateLimiter);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Received body, ${req.body}`);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, '/api');
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: `Internal Server error`,
      error: err.message,
    });
  },
};

// setting up proxy for our identity service
app.use(
  '/v1/auth',
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['Content-Type'] = 'application/json';
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// setting up proxy for our post service
app.use(
  '/v1/posts',
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['Content-Type'] = 'application/json';
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from post service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// setting up proxy for our media service
app.use(
  '/v1/media',
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;

      // Fix: Ensure multipart/form-data requests are properly forwarded
      const contentType = srcReq.headers['content-type'];
      if (contentType && contentType.includes('multipart/form-data')) {
        proxyReqOpts.headers['Content-Type'] = contentType;
      } else {
        proxyReqOpts.headers['Content-Type'] = 'application/json';
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from media service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false, // ✅ Required for file uploads
  })
);

// setting up proxy for our search service

app.use(
  '/v1/search',
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['Content-Type'] = 'application/json';
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from search service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);


app.use(errorHandler);

app.listen(port, () => {
  logger.info(`API Gateway is running on port ${port}`);
  logger.info(
    `Identity Service running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `Identity Service running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(`media Service running on port ${process.env.MEDIA_SERVICE_URL}`);
  logger.info(`search Service running on port ${process.env.SEARCH_SERVICE_URL}`);
  logger.info(`Redis Url running on port ${process.env.REDIS_URL}`);
});
