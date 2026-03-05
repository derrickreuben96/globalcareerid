import { z } from 'zod';

// Common validation schemas for reuse across the application

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(100, 'Must be 100 characters or less')
  .regex(/^[a-zA-Z\s'-]+$/, 'Only letters, spaces, hyphens and apostrophes allowed');

export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email must be 255 characters or less');

export const phoneSchema = z
  .string()
  .trim()
  .max(30, 'Phone must be 30 characters or less')
  .regex(/^[+\d\s()-]*$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less');

export const skillSchema = z
  .string()
  .trim()
  .min(1, 'Skill cannot be empty')
  .max(50, 'Skill must be 50 characters or less')
  .regex(/^[a-zA-Z0-9\s\-+#.]+$/, 'Invalid characters in skill');

export const companyNameSchema = z
  .string()
  .trim()
  .min(1, 'Company name is required')
  .max(200, 'Company name must be 200 characters or less');

export const jobTitleSchema = z
  .string()
  .trim()
  .min(1, 'Job title is required')
  .max(100, 'Job title must be 100 characters or less');

export const departmentSchema = z
  .string()
  .trim()
  .max(100, 'Department must be 100 characters or less')
  .optional()
  .or(z.literal(''));

export const profileIdSchema = z
  .string()
  .trim()
  .regex(/^TW-\d{4}-[A-Z0-9]{5}$/i, 'Invalid Profile ID format (e.g., TW-2026-ABC12)');

export const disputeReasonSchema = z
  .string()
  .trim()
  .min(10, 'Please provide more detail (at least 10 characters)')
  .max(1000, 'Reason must be 1000 characters or less');

// Country schema (optional)
export const countrySchema = z
  .string()
  .trim()
  .max(100, 'Country must be 100 characters or less')
  .optional()
  .or(z.literal(''));

// Job seeker registration schema
export const jobSeekerRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  country: countrySchema,
  citizenship: countrySchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Employer registration schema
export const employerRegistrationSchema = z.object({
  companyName: companyNameSchema,
  registrationNumber: z.string().trim().min(1, 'Registration number is required').max(50, 'Too long'),
  country: z.string().trim().min(1, 'Country is required').max(100, 'Too long'),
  industry: z.string().trim().min(1, 'Industry is required').max(100, 'Too long'),
  phone: z.string().trim().min(1, 'Company phone is required').max(30, 'Too long').regex(/^[+\d\s()-]+$/, 'Invalid phone number format'),
  website: z.string().trim().min(1, 'Website is required').max(255, 'Too long'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Add employee form schema
export const addEmployeeSchema = z.object({
  profileId: profileIdSchema,
  jobTitle: jobTitleSchema,
  department: departmentSchema,
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']),
  startDate: z.string().min(1, 'Start date is required'),
});

// Utility function to validate and get errors
export function validateField<T>(schema: z.ZodType<T>, value: unknown): { success: boolean; error?: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true };
  }
  return { success: false, error: result.error.errors[0]?.message };
}

// Utility function to validate entire form
export function validateForm<T>(schema: z.ZodType<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  return { success: false, errors };
}
