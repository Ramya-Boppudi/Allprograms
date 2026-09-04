const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '../../uploads/grievances');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXT = /\.(pdf|jpe?g|png|docx?)$/i;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_EXT.test(file.originalname)) {
      const err = new Error('Allowed files: PDF, JPG, PNG, DOC, DOCX');
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

function attachmentsUpload(req, res, next) {
  upload.array('attachments', 5)(req, res, (err) => {
    if (!err) return next();
    err.statusCode = err.statusCode || 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.message = 'Each file must be 8 MB or smaller';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      err.message = 'You can upload up to 5 files';
    }
    next(err);
  });
}

module.exports = { attachmentsUpload };
