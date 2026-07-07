import * as bcrypt from 'bcrypt';

/**
 * Utility functions for password hashing and comparison using bcrypt.
 */

const DEFAULT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt.
 * @param password The plaintext password
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const rounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : DEFAULT_ROUNDS;
  return bcrypt.hash(password, rounds);
}

/**
 * Compare a plaintext password with a hashed password.
 * @param password The plaintext password
 * @param hash The password hash to compare against
 * @returns True if they match, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
