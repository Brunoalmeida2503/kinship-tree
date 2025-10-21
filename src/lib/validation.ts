import { z } from 'zod';

export const postSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Post cannot be empty')
    .max(5000, 'Post must be less than 5000 characters'),
  shareWithTree: z.boolean(),
  selectedGroups: z.array(z.string().uuid()).max(10, 'Cannot share with more than 10 groups')
});

export const profileSchema = z.object({
  full_name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\u00C0-\u017F]+$/, 'Name contains invalid characters'),
  bio: z.string()
    .trim()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  birth_date: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const memorySchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
});

export const groupMemorySchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
});

export const youtubeUrlSchema = z.string()
  .url()
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === 'www.youtube.com' || 
               parsed.hostname === 'youtube.com' || 
               parsed.hostname === 'youtu.be';
      } catch {
        return false;
      }
    },
    'Invalid YouTube URL'
  );

export const groupPostSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Post cannot be empty')
    .max(5000, 'Post must be less than 5000 characters'),
});

export const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters'),
});
