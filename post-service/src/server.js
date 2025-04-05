require('dotenv').config();

const express = require('express');
const db = require('./database/db');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const postRoutes = require('./routes/postRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const {connectToRabitMQ} = require('./utils/rabbitmq');


const app = express();

db();
const port = process.env.PORT || 3002;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Received body, ${req.body}`);
  next();
});

// routes -> pash redisClient to routes
app.use(
  '/api/posts',
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabitMQ()

app.listen(port, () => {
  logger.info(`Post service running on port ${port}`);
});
  } catch (error) {
    logger.error('Failed to connect to server', error)
    process.exit(1)
  }
}
startServer()

// unhandled promise rejection

process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandled Rejection at ', promise, 'reason: ', reason);
});
