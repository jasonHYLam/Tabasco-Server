require("dotenv").config();
const sharp = require("sharp");
const { upload, uploadDirectlyToCloudinary } = require("../config/multer");
const asyncHandler = require("express-async-handler");
const { cloudinary } = require("../config/cloudinary");
const { uploader } = cloudinary;

const uploadFiles = (req, res, next) => {
  uploadDirectlyToCloudinary.single("images")(req, res, next);
  upload.single("images")(req, res, next);
};

const createThumbnailFromDuplicate = asyncHandler(async (req, res, next) => {
  const { originalname } = req.file;
  const thumbnailName = `thumbnail-${originalname}`;
  await sharp(req.file.buffer)
    .resize(300, 300, { fit: "cover" })
    .toFormat("webp")
    .toFile(thumbnailName);
  const response = await uploader.upload(thumbnailName, {
    folder: `odinbook/${process.env.MODE}/thumbnail`,
  });
  req.thumbnailURL = response.secure_url;
  next();
});

module.exports = {
  uploadFiles,
  createThumbnailFromDuplicate,
};
