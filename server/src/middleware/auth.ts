import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({ error: "JWT secret not configured" });
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
