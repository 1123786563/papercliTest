/**
 * Authentication Service
 *
 * Handles user registration, login, and token management.
 */

import { eq } from 'drizzle-orm';
import { db } from '@prism-era/db';
import { users, type User, type NewUser } from '@prism-era/db';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/password';
import { generateTokenPair, TokenPair, TokenPayload } from '../lib/jwt';

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  tokens: TokenPair;
}

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, name } = input;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join('. '));
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      role: 'member',
      isActive: true,
      clerkId: `local_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } as NewUser)
    .returning();

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
  };

  const tokens = await generateTokenPair(tokenPayload);

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = newUser;

  return {
    user: userWithoutPassword as Omit<User, 'passwordHash'>,
    tokens,
  };
}

/**
 * Login user
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user has password authentication
  if (!(user as any).passwordHash) {
    throw new Error(
      'This account uses external authentication. Please login with your provider.'
    );
  }

  // Verify password
  const isValid = await verifyPassword(password, (user as any).passwordHash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Your account has been deactivated. Please contact support.');
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = await generateTokenPair(tokenPayload);

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = user as any;

  return {
    user: userWithoutPassword,
    tokens,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshToken: string): Promise<TokenPair> {
  const payload = await verifyRefreshToken(refreshToken);

  if (!payload) {
    throw new Error('Invalid or expired refresh token');
  }

  // Check if user still exists and is active
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  // Generate new token pair
  const newTokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return generateTokenPair(newTokenPayload);
}

/**
 * Verify refresh token
 */
async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  const { verifyToken } = await import('../lib/jwt');
  const payload = await verifyToken(token);

  if (!payload || (payload as any).type !== 'refresh') {
    return null;
  }

  return payload;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return null;
  }

  const { passwordHash: _, ...userWithoutPassword } = user as any;
  return userWithoutPassword;
}
