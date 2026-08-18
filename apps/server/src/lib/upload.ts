import multer from 'multer';
import { AppError } from './AppError.js';

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new AppError(400, 'Only image files are allowed', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
      cb(new AppError(400, 'Only JPG, PNG or PDF files are allowed', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

export function extensionFor(mimetype: string): string {
  if (mimetype === 'application/pdf') return 'pdf';
  const ext = mimetype.split('/')[1] ?? 'jpg';
  return ext === 'jpeg' ? 'jpg' : ext;
}
