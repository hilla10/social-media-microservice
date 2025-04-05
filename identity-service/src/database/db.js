const mongoose = require('mongoose');
const logger = require('../utils/logger');

const db = async () => {
  return mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => logger.info('Connected to mongodb'))
    .catch((e) => logger.error('Mongodb Connection error', e));
};

module.exports = db;
