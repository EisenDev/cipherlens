import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * JWT payload structure.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  jti: string;
}

/**
 * Tokens returned after successful login.
 */
export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate Access and Refresh tokens for a user.
 * @param userId The unique user ID
 * @param email The user email
 * @returns TokenPayload containing accessToken and refreshToken
 */
export function generateTokens(userId: string, email: string): TokenPayload {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_change_me_in_prod';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_me_in_prod';

  const accessToken = jwt.sign(
    { userId, email, jti: crypto.randomUUID() },
    accessSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, email, jti: crypto.randomUUID() },
    refreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify an access token.
 * @param token The access token to verify
 * @returns Decoded JwtPayload if valid, throws otherwise
 */
export function verifyAccessToken(token: string): JwtPayload {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_change_me_in_prod';
  return jwt.verify(token, accessSecret) as JwtPayload;
}

/**
 * Verify a refresh token.
 * @param token The refresh token to verify
 * @returns Decoded JwtPayload if valid, throws otherwise
 */
export function verifyRefreshToken(token: string): JwtPayload {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_me_in_prod';
  return jwt.verify(token, refreshSecret) as JwtPayload;
}
