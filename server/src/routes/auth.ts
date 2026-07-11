import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/User";
import { Relationship } from "../models/Relationship";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ── Validation schemas ──────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  inviteCode: z.string().min(1, "Invite code is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// ── Helper ──────────────────────────────────────────────────

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ userId }, secret, { expiresIn: "30d" });
}

// ── POST /register ──────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { name, email, password, inviteCode } = parsed.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Find relationship by invite code
    const relationship = await Relationship.findOne({ inviteCode });
    if (!relationship) {
      res.status(404).json({ error: "Invalid invite code" });
      return;
    }

    // Check if relationship already has 2 users
    if (relationship.user2) {
      res.status(400).json({ error: "Invite code has already been used" });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      relationshipId: relationship._id,
    });

    // Link user2 to relationship and activate it
    relationship.user2 = user._id;
    relationship.status = "active";
    await relationship.save();

    // Set partner references on both users
    const user1 = await User.findById(relationship.user1);
    if (user1) {
      user1.partnerId = user._id;
      await user1.save();

      user.partnerId = user1._id;
      await user.save();
    }

    const token = signToken(user._id.toString());

    res.status(201).json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /login ─────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user._id.toString());

    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /invite ────────────────────────────────────────────
// Creates a new relationship + invite code for the first user
router.post("/invite", async (req: Request, res: Response) => {
  try {
    const inviteSchema = z.object({
      name: z.string().min(1, "Name is required").max(100),
      email: z.string().email("Invalid email"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    });

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user first
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    // Generate invite code and create relationship
    const inviteCode = uuidv4().slice(0, 8).toUpperCase();

    const relationship = await Relationship.create({
      user1: user._id,
      inviteCode,
      status: "pending",
    });

    // Link relationship to user
    user.relationshipId = relationship._id;
    await user.save();

    const token = signToken(user._id.toString());

    res.status(201).json({
      token,
      user: user.toJSON(),
      inviteCode,
    });
  } catch (error) {
    console.error("Invite error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /me ─────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId)
      .select("-passwordHash")
      .populate("partnerId", "name email avatar")
      .populate("relationshipId");

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
