import { z } from 'zod';

// ─── Password Rules ───────────────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number');

// ─── Login Schema ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

// ─── Register Schema ──────────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Stock Symbol Schema ──────────────────────────────────────────────────────
export const stockSymbolSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Please enter a stock symbol')
    .max(10, 'Symbol too long')
    .regex(/^[A-Z0-9.]+$/, 'Invalid stock symbol format'),
});

// ─── Trade Schema ─────────────────────────────────────────────────────────────
export const tradeSchema = z.object({
  symbol: z.string().trim().toUpperCase().min(1, 'Symbol required'),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .positive('Quantity must be positive')
    .max(100_000, 'Quantity too large'),
  action: z.enum(['BUY', 'SELL']),
});

// ─── Exported types ───────────────────────────────────────────────────────────
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type StockSymbolValues = z.infer<typeof stockSymbolSchema>;
export type TradeFormValues = z.infer<typeof tradeSchema>;
