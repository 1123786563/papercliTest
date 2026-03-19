/**
 * Authentication Middleware
 *
 * Protects routes by validating JWT tokens and injecting user context.
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyToken, extractBearerToken, TokenPayload } from '../lib/jwt';

// Extend Hono's context variables
declare module 'hono' {
  interface ContextVariableMap {
    user: TokenPayload;
  }
}

/**
 * Require authentication middleware
 * Validates JWT token and injects user into context
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    throw new HTTPException(401, {
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    throw new HTTPException(401, {
      message: 'Invalid or expired token. Please login again.',
    });
  }

  // Inject user into context
  c.set('user', payload);

  await next();
}

/**
 * Optional authentication middleware
 * Attempts to validate token but doesn't require it
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      c.set('user', payload);
    }
  }

  await next();
}

/**
 * Require specific role middleware
 * Must be used after requireAuth
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      throw new HTTPException(403, {
        message: 'You do not have permission to access this resource',
      });
    }

    await next();
  };
}

/**
 * Get current user from context
 * Throws if user is not authenticated
 */
export function getCurrentUser(c: Context): TokenPayload {
  const user = c.get('user');
  if (!user) {
    throw new HTTPException(401, {
      message: 'Authentication required',
    });
  }
  return user;
}
