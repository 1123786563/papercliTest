/**
 * Authentication Routes
 *
 * API endpoints for user registration, login, and token management.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import * as authService from '../services/auth';
import { requireAuth, getCurrentUser } from '../middleware/auth';

const auth = new Hono();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Validate request body helper
 */
function validateBody<T extends z.ZodType<any, any>>(
  body: unknown,
  schema: T
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.errors.map((e: any) => e.message).join('. '),
    });
  }
  return result.data;
}

/**
 * POST /auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, registerSchema);

  try {
    const result = await authService.register(validated);

    return c.json(
      {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, loginSchema);

  try {
    const result = await authService.login(validated);

    return c.json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
    throw new HTTPException(401, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
auth.post('/refresh', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, refreshSchema);

  try {
    const tokens = await authService.refreshToken(validated.refreshToken);

    return c.json({
      success: true,
      data: {
        tokens,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(401, { message: error.message });
    }
    throw error;
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
auth.get('/me', requireAuth, async (c) => {
  const user = getCurrentUser(c);

  const fullUser = await authService.getUserById(user.userId);

  if (!fullUser) {
    throw new HTTPException(404, {
      message: 'User not found',
    });
  }

  return c.json({
    success: true,
    data: {
      user: fullUser,
    },
  });
});

/**
 * POST /auth/logout
 * Logout user (client should discard tokens)
 */
auth.post('/logout', async (c) => {
  // In a stateless JWT system, logout is handled client-side
  // by discarding the tokens. For enhanced security, we could
  // implement token blacklisting with Redis.
  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Error handler for auth routes
 */
auth.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: err.status,
        },
      },
      err.status
    );
  }

  console.error('Auth error:', err);

  return c.json(
    {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 500,
      },
    },
    500
  );
});

export { auth as authRoutes };
