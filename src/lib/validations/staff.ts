import { z } from 'zod';

export const staffSchema = z.object({
  fullName: z.string()
    .min(3, 'Full name must be at least 3 characters')
    .max(100, 'Name too long')
    .transform(val => val.trim()),
  email: z.string().email('Enter a valid email address'),
  phone: z.string()
    .regex(/^(\+255|0)\d{9}$/, 'Must be a valid Tanzanian phone number (e.g., 0712345678)'),
  role: z.enum(['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR', 'VIEWER'], {
    errorMap: () => ({ message: 'Select a valid role' })
  }),
  department: z.string().optional(),
  joinedDate: z.string().min(1, 'Join date is required'),
});

export type StaffFormData = z.infer<typeof staffSchema>;
