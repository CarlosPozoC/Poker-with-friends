import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { config } from '../config';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email().optional(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);
    const userEmail = email || `${username}@poker.local`;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: userEmail }, { username }] },
    });
    if (existing) {
      res.status(400).json({ error: 'Username already taken' });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email: userEmail, password: hashed },
    });

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, balance: user.balance, avatarUrl: user.avatarUrl },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = loginSchema.parse(req.body);

    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : username
        ? await prisma.user.findUnique({ where: { username } })
        : null;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '24h' });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, balance: user.balance, avatarUrl: user.avatarUrl },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;