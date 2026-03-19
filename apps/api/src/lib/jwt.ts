/**
 * JWT Token Management
 *
 * Handles JWT token generation, validation, and refresh for user authentication.
 * Uses jose library for secure JWT operations.
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'prism-era-jwt-secret-change-in-production'
);

const JWT_EXPIRES_IN = '7d'; // Access token expires in 7 days
const JWT_REFRESH_EXPIRES_IN = '30d'; // Refresh token expires in 30 days

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate access token for user
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('prism-era')
    .setAudience('prism-era-api')
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

/**
 * Generate refresh token for user
 */
export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('prism-era')
    .setAudience('prism-era-api')
    .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
    .sign(JWT_SECRET);
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);

  // Calculate expiration time in seconds (7 days)
  const expiresIn = 7 * 24 * 60 * 60;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'prism-era',
      audience: 'prism-era-api',
    });

    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
