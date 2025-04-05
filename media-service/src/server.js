require('dotenv').config();

const express = require('express');
const db = require('./database/db');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const mediaRoutes = require('./routes/mediaRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const {connectToRabitMQ,consumeEvent} = require('./utils/rabbitmq');
const {handlePostDeleted} = require('./eventHandlers/mediaEventHandlers')

const app = express();

db();
const port = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '500mb' }));

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Received body, ${req.body}`);
  next();
});

app.use('/api/media', mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabitMQ()

    // consume all the events
    await consumeEvent('post.deleted', handlePostDeleted)

app.listen(port, () => {
  logger.info(`Media service running on port ${port}`);
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

