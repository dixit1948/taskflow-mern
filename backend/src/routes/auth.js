import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import User from "../models/User.js";
import { config, isProd } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: config.sameSite,
  path: "/"
};

const issueSession = (res, user) => {
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: `${config.jwtExpiresDays}d`
  });
  res.cookie("token", token, { ...cookieOptions, maxAge: config.jwtExpiresDays * 864e5 });
};

const publicUser = user => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt
});

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." }
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer")
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/\d/, "Password must include a number")
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password")
});

// Used so a missing account takes as long to reject as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("taskflow-dummy-password", 12);

router.post("/register", limiter, async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);

  if (await User.exists({ email })) {
    throw new AppError(409, "An account with this email already exists");
  }

  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  issueSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", limiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select("+passwordHash");
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid) throw new AppError(401, "Incorrect email or password");

  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Signed out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.clearCookie("token", cookieOptions);
    throw new AppError(401, "Please sign in to continue");
  }
  res.json({ user: publicUser(user) });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(50) }).parse(req.body);
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(404, "Account not found");
  user.name = name;
  await user.save();
  res.json({ user: publicUser(user) });
});

export default router;
