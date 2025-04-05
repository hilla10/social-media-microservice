const express = require('express');
const multer = require('multer');

const { uploadMedia, getAllMedias } = require('../controllers/mediaController');
const { authenticateRequest } = require('../middleware/authMiddleware');

const logger = require('../utils/logger');

const router = express.Router();

// configure multer for file upload

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // ✅ Correct: 500MB limit
}).single('file');

router.post(
  '/upload',
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        console.log(err);
        logger.error('multer error while uploading ', err);
        return res.status(400).json({
          message: 'multer error while uploading ',
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error('Unknown error occurred while uploading ', err);
        return res.status(500).json({
          message: 'Unknown error occurred while uploading ',
          error: err.message,
          stack: err.stack,
        });
      }

      if (!req.file) {
        logger.error('No file found! ', err);
        return res.status(400).json({
          message: 'No file found! ',
        });
      }
      next();
    });
  },
  uploadMedia
);

router.get('/get',authenticateRequest, getAllMedias )

module.exports = router;
