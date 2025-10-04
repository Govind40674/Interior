const multer = require("multer");
const path = require("path");
const fs = require("fs");
// const tempDir = path.join(__dirname, "../temp");
// if (!fs.existsSync(tempDir)) {
//   fs.mkdirSync(tempDir);
// }

// Storage setup
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "tempDir"); // where files will be stored
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// // File filter
// const filefilter = (req, file, cb) => {
//   if (
//     file.mimetype === "image/jpeg" ||
//     file.mimetype === "image/png" ||
//     file.mimetype === "image/webp"
//   ) {
//     cb(null, true);
//   } else {
//     cb(new Error("only jpeg, png and webp files are allowed"), false);
//   }
// };

// // Multer instance
// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 3 * 1024 * 1024 },
//   fileFilter: filefilter
// });
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

const upload = multer({ storage });

module.exports = upload;

module.exports = upload;
