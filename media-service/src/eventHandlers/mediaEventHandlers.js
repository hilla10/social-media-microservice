const Media = require('../models/media')
const {deleteMediaFromCloudinary} = require('../utils/cloudinary')

const handlePostDeleted = async(event) => {
console.log(event, 'eventeventevent')
const {postId, mediaIds} = event

try {
    const mediaToDelte = await Media.find({_id: {$in: mediaIds}})

    for(const media of mediaToDelte) {
        await deleteMediaFromCloudinary(media.publicId)
        await Media.findByIdAndDelte(media._id)
        logger.info(`Deleted media ${media._id} associated with this deleted post ${postId}`)
    }

    logger.inof(`Proccessed deleteion of media for post id ${postId}`)

} catch (e) {
    logger.error(e, 'Error occurred while media deletion')
}
}

module.exports = {handlePostDeleted}