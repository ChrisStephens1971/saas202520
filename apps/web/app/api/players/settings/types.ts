/**
 * Player Settings API Types
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * Type definitions for player settings API requests and responses
 */

import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const PrivacySettingsSchema = z.object({
  isProfilePublic: z.boolean().optional(),
  showStatistics: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showHistory: z.boolean().optional(),
});

export const NotificationCategoriesSchema = z.object({
  tournaments: z.boolean().optional(),
  matches: z.boolean().optional(),
  achievements: z.boolean().optional(),
  social: z.boolean().optional(),
});

export const NotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  categories: NotificationCategoriesSchema.optional(),
});

export const UpdateSettingsSchema = z.object({
  // Privacy settings
  isProfilePublic: z.boolean().optional(),
  showStatistics: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showHistory: z.boolean().optional(),

  // Notification preferences
  emailNotifications: NotificationPreferencesSchema.optional(),
  pushNotifications: NotificationPreferencesSchema.optional(),
  smsNotifications: NotificationPreferencesSchema.optional(),

  // Display preferences
  theme: z.enum(['LIGHT', 'DARK', 'AUTO']).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().optional(),
});

// ============================================================================
// REQUEST TYPES
// ============================================================================

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;
export type NotificationCategories = z.infer<typeof NotificationCategoriesSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SettingsResponse {
  settings: {
    privacy: {
      isProfilePublic: boolean;
      showStatistics: boolean;
      showAchievements: boolean;
      showHistory: boolean;
    };
    notifications: {
      email: NotificationPreferences | Record<string, unknown>;
      push: NotificationPreferences | Record<string, unknown>;
      sms: NotificationPreferences | Record<string, unknown>;
    };
    display: {
      theme: 'LIGHT' | 'DARK' | 'AUTO';
      language: string;
      timezone: string | null;
    };
    metadata: {
      createdAt: Date | string;
      updatedAt: Date | string;
    };
  };
  message?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface SettingsErrorResponse {
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}
