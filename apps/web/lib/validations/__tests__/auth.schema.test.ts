/**
 * Authentication Schema Tests
 *
 * Unit tests for Zod validation schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  loginSchema,
  signupSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from '../auth.schema';

describe('loginSchema', () => {
  describe('email validation', () => {
    it('should accept valid email', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'Password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Email is required');
      }
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address');
      }
    });

    it('should trim and lowercase email', () => {
      const result = loginSchema.safeParse({
        email: '  USER@EXAMPLE.COM  ',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  describe('password validation', () => {
    it('should accept valid password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password is required');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Pass123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must be at least 8 characters');
      }
    });
  });

  describe('rememberMe field', () => {
    it('should accept rememberMe as optional', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept rememberMe as true', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
        rememberMe: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(true);
      }
    });

    it('should accept rememberMe as false', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
        rememberMe: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(false);
      }
    });
  });
});

describe('signupSchema', () => {
  const validSignupData = {
    email: 'user@example.com',
    password: 'Password123',
    confirmPassword: 'Password123',
    name: 'John Doe',
  };

  it('should accept valid signup data', () => {
    const result = signupSchema.safeParse(validSignupData);
    expect(result.success).toBe(true);
  });

  describe('email validation', () => {
    it('should reject invalid email', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        email: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should reject password without uppercase letter', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('uppercase');
      }
    });

    it('should reject password without lowercase letter', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('lowercase');
      }
    });

    it('should reject password without number', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        password: 'PasswordABC',
        confirmPassword: 'PasswordABC',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('number');
      }
    });

    it('should reject password longer than 100 characters', () => {
      const longPassword = 'A'.repeat(101) + '1';
      const result = signupSchema.safeParse({
        ...validSignupData,
        password: longPassword,
        confirmPassword: longPassword,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('100 characters');
      }
    });
  });

  describe('password confirmation', () => {
    it('should reject mismatched passwords', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        password: 'Password123',
        confirmPassword: 'Password456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Passwords do not match');
      }
    });

    it('should accept matching passwords', () => {
      const result = signupSchema.safeParse(validSignupData);
      expect(result.success).toBe(true);
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        name: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name is required');
      }
    });

    it('should reject name shorter than 2 characters', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        name: 'A',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name must be at least 2 characters');
      }
    });

    it('should reject name longer than 50 characters', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        name: 'A'.repeat(51),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name must be less than 50 characters');
      }
    });

    it('should trim name', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        name: '  John Doe  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });
  });
});

describe('resetPasswordRequestSchema', () => {
  it('should accept valid email', () => {
    const result = resetPasswordRequestSchema.safeParse({
      email: 'user@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty email', () => {
    const result = resetPasswordRequestSchema.safeParse({
      email: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = resetPasswordRequestSchema.safeParse({
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
  });

  it('should trim and lowercase email', () => {
    const result = resetPasswordRequestSchema.safeParse({
      email: '  USER@EXAMPLE.COM  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });
});

describe('resetPasswordSchema', () => {
  const validResetData = {
    password: 'NewPassword123',
    confirmPassword: 'NewPassword123',
    token: 'valid-reset-token-12345',
  };

  it('should accept valid reset password data', () => {
    const result = resetPasswordSchema.safeParse(validResetData);
    expect(result.success).toBe(true);
  });

  it('should reject mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      ...validResetData,
      confirmPassword: 'DifferentPassword123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Passwords do not match');
    }
  });

  it('should reject empty token', () => {
    const result = resetPasswordSchema.safeParse({
      ...validResetData,
      token: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Reset token is required');
    }
  });

  it('should enforce password strength requirements', () => {
    const result = resetPasswordSchema.safeParse({
      ...validResetData,
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
