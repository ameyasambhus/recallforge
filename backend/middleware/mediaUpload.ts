import multer from 'multer';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(['application/pdf']);

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  const isPdf = ACCEPTED_MIME_TYPES.has(file.mimetype);

  if (isImage || isVideo || isPdf) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image (including GIF), video, and PDF files are allowed'));
};

const mediaUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 3,
  },
  fileFilter,
});

export default mediaUpload;
