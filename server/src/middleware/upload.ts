import multer from 'multer';
import os from 'os';
import path from 'path';

// Use memory storage for Cloud Run compatibility — files will be processed
// in-memory and written to /tmp when needed. This avoids relying on
// container-local persistent disk.
const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '8') * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, and PNG are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
    files: 3,
  },
});

export const uploadMiddleware = upload.array('images', 3);