import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';

const router = Router();

if (!fs.existsSync(config.avatarsDir)) {
  fs.mkdirSync(config.avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.avatarsDir);
  },
  filename: (req: Request, file, cb) => {
    const userId = (req as any).userId;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${userId}_${Date.now()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxAvatarSize },
});

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    (req as any).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/avatar', authMiddleware, (req: Request, res: Response) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File too large. Max size is 2MB' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const userId = (req as any).userId;
    const relativePath = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.avatarUrl) {
      const oldFilename = user.avatarUrl.replace(/^\/uploads\/avatars\//, '');
      const oldPath = path.join(config.avatarsDir, oldFilename);
      try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: relativePath },
    });

    res.json({ avatarUrl: relativePath });
  });
});

export default router;
