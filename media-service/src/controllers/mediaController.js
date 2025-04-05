const Media = require('../models/media');
const { uploadMediaToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');
const uploadMedia = async (req, res) => {
logger.info('Starting media upload');
  //   console.log(req.file);

  try {
    if (!req.file) {
      logger.error('no file found please try add a file and try again');
      return res.status(400).json({
        success: false,
        message: 'no file found please try add a file and try again',
      });
    }

    const { originalname, mimetype, buffer } = req.file;

    const userId = req.user;

    logger.info(`File details: name=${originalname}, type:${mimetype}`);
    logger.info('Uploading to cloudinary starting');

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `Cloudinary upload successfully. PublicId: ${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = await Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();
    console.log(newlyCreatedMedia);
    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: 'Media upload is successfully',
    });
  } catch (e) {
    logger.error('Error uploading media', e);
    console.log(e);
    res.status(500).json({
      success: false,
      message: '',
    });
  }
};

const getAllMedias = async(req, res) => {
  try {
    
    const results = await Media.find({})
    res.json({results})

  } catch (e) {
    logger.error('Error fetching medias', e);
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'error fetching medias',
    });
  }
}


module.exports = { uploadMedia, getAllMedias };
