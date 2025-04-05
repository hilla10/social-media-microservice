const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const db = require('../src/database/db');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit');
const logger = require('./utils/logger');
const { RedisStore } = require('rate-limit-redis');
const routes = require('../src/routes/identityService');
const errorHandler = require('../src/middleware/errorHandler');
require('dotenv').config();

const app = express();

// mongodb connection
db();

const redisClient = new Redis(process.env.REDIS_URL);

const port = process.env.PORT || 3001;
// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Received body, ${req.body}`);
  next();
});

// DDOS protection rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.id}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests',
      });
    });
});

// ip based rate limiting ro sensitive endpoints

const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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

// apply this sensitiveEndpointsLimiter to our routes
app.use('/api/auth/register', sensitiveEndpointsLimiter);

// Routes
app.use('/api/auth', routes);

// error handler
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Identity service running on port ${port}`);
});

// unhandled promise rejection

process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandled Rejection at ', promise, 'reason: ', reason);
});
