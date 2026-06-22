const multer = require("multer");

const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".docx", ".txt", ".xlsx"];

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const lowerName = file.originalname.toLowerCase();
  const isAllowed = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!isAllowed) {
    return cb(
      new Error(
        `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
      )
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;
