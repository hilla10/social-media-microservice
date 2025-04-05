const cloudinary = require('cloudinary').v2;
require('dotenv').config();


const logger = require('./logger');

cloudinary.config({
  // cloud_name: process.env.cloud_name,
  // api_key: process.env.api_key,
  // api_secret: process.env.api_secret,
  cloud_name: 'dglsh0lfp', 
  api_key: '251956842858535', 
  api_secret: 'YOZaQlMmVP0fw6jgVY1klHYQ8ls'
});

const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          logger.error('Error while uploading media to cloudinary', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

const deleteMediaFromCloudinary = async(publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    logger.info('Media deleted successfully from cloud storage', publicId)
    return result

  } catch (error) {
    logger.error('Error deleting media from cloudinary', error)
    throw error
  }
}

module.exports = { uploadMediaToCloudinary,deleteMediaFromCloudinary };
