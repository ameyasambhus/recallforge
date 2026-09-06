import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import mediaUpload from './mediaUpload.js';

const mediaUploadParser = (req: Request, res: Response, next: NextFunction) => {
  mediaUpload.array('media', 3)(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, error: 'Each file must be 2 MB or smaller' });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ success: false, error: 'Maximum 3 files are allowed per upload' });
        return;
      }
    }

    if (err instanceof Error) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid upload payload' });
  });
};

export default mediaUploadParser;
