import { z } from "zod";

// Auth schemas
export const registerSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().optional(),
});

export const loginSchema = z.object({
  phoneNumber: z.string().min(10),
  password: z.string().min(6),
});

// User update schema
export const updateUserSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  profileImage: z.string().optional(), // base64 image
});

// Project schemas
export const publishProjectSchema = z.object({
  type: z.enum(["novel", "poetry", "shortStory", "manuscript"]),
  title: z.string().min(1),
  description: z.string().optional(),
  genre: z.string().optional(),
  authorName: z.string().optional(),
  coverImage: z.string().optional(), // base64
  wordCount: z.number().default(0),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  publicationDate: z.string().optional(),
  price: z.number().optional(),
  language: z.string().default("en"),
  copyrightText: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  allowDownloads: z.boolean().default(false),
  items: z.array(z.object({
    parentItemId: z.string().optional(),
    itemType: z.string(),
    name: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    metadata: z.any().optional(),
    orderIndex: z.number().default(0),
    depthLevel: z.number().default(0),
    wordCount: z.number().default(0),
  })),
});

// Comment schema
export const createCommentSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().min(1),
  parentCommentId: z.string().uuid().optional(),
});

// Like schema
export const toggleLikeSchema = z.object({
  projectId: z.string().uuid(),
});

// Follow schema
export const toggleFollowSchema = z.object({
  followingId: z.string().uuid(),
});

// Reading progress schema
export const updateReadingProgressSchema = z.object({
  projectId: z.string().uuid(),
  lastReadItemId: z.string().uuid().optional(),
  progressPercentage: z.number().min(0).max(100),
});