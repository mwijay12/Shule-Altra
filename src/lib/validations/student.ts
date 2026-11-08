import { z } from 'zod';
import { O_LEVEL_CLASSES } from '@/lib/academics/config';

export const studentSchema = z.object({
  id: z.string().min(3, 'ID required'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .transform(val => val.toUpperCase().trim()),
  class: z.string().min(1, 'Select a class'),
  type: z.enum(['Boarder', 'Day']),
  gender: z.enum(['Male', 'Female']),
  dateOfBirth: z.string().min(1, 'Date of birth required'),
  guardianName: z.string().min(2, 'Guardian name required'),
  guardianPhone: z.string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(/^(\+255|0)\d{9}$/, 'Must be a valid Tanzanian phone number (e.g., 0712345678 or +255712345678)'),
  enrollmentDate: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;
/** Demo admissions are O-level only; live schools keep their configured tiers. */
export const oLevelStudentSchema = studentSchema.extend({
  class: z.enum(O_LEVEL_CLASSES, { errorMap: () => ({ message: 'Select Form 1, 2, 3 or 4' }) }),
});
