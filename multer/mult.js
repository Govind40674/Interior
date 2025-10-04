const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "interior_project", // Cloudinary folder name
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function fileFilter(req, file, cb) {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WEBP files are allowed."), false);
  }
}

// 🔹 Final Upload Middleware
const upload = multer({ storage, fileFilter });

module.exports = upload;

// const upload = multer({ storage });

// module.exports = upload;


