import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-encryption-key-32-chars';

// Type definitions
interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  exp?: number;
  iat?: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface SessionData {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

// Add runtime check function instead of module-level validation
function validateEncryptionKey() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === 'fallback-encryption-key-32-chars') {
      console.warn('Warning: ENCRYPTION_KEY should be set in production');
    }
  }
}

// Production check for JWT_SECRET
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    console.warn('Warning: JWT_SECRET should be set in production');
  }
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT Token creation
export function createJWTToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// JWT Token verification
export function verifyJWTToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Session management
export function createSession(user: User): SessionData {
  const token = createJWTToken({ userId: user.id, email: user.email, role: user.role });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  };
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

// Error sanitization
export function sanitizeError(error: unknown): { message: string; status: number } {
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return {
      message: 'Internal server error',
      status: 500
    };
  }

  // Type guard for error with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return {
      message: (error as { message: string }).message || 'Unknown error',
      status: (error as { status?: number }).status || 500
    };
  }

  return {
    message: 'Unknown error',
    status: 500
  };
}

// Get client IP from request
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}
