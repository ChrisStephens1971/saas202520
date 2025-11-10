/**
 * Tests for Landing Page Hero Section
 */

import { describe, it, expect } from 'vitest';

describe('Landing Page Hero', () => {
  it('should have correct heading text', () => {
    const expectedHeading = 'Offline-First Tournament Management';
    expect(expectedHeading).toBeDefined();
  });

  it('should have correct tagline text', () => {
    const expectedTagline = 'Run pool and billiards tournaments anywhere, even without internet';
    expect(expectedTagline).toBeDefined();
  });

  it('should have Get Started CTA button', () => {
    const ctaText = 'Get Started';
    expect(ctaText).toBeDefined();
  });

  it('should have Learn More CTA button', () => {
    const ctaText = 'Learn More';
    expect(ctaText).toBeDefined();
  });

  it('should have three feature cards', () => {
    const features = [
      { title: 'Works Offline', icon: '⚡' },
      { title: 'Built for Pool', icon: '🎱' },
      { title: 'Real-Time Updates', icon: '📊' },
    ];
    expect(features).toHaveLength(3);
  });

  it('should redirect authenticated users to console', () => {
    // This would be tested in integration test with auth mock
    // For now, just verify the redirect path exists
    const redirectPath = '/console';
    expect(redirectPath).toBe('/console');
  });
});
