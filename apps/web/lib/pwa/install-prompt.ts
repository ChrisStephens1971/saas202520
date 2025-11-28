/**
 * PWA Install Prompt Management System
 *
 * Handles detection, timing, and display of PWA install prompts
 * with smart timing and platform-specific behavior.
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptState {
  canInstall: boolean;
  isInstalled: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  shouldShow: boolean;
  visitCount: number;
  lastShown: string | null;
  neverShow: boolean;
}

const STORAGE_KEY = 'pwa_install_state';
const MIN_VISITS_BEFORE_PROMPT = 3;
const DAYS_BETWEEN_PROMPTS = 7;

class InstallPromptManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private state: InstallPromptState;
  private listeners: Set<(state: InstallPromptState) => void> = new Set();

  constructor() {
    this.state = this.loadState();
    this.detectPlatform();
    this.checkIfInstalled();
    this.incrementVisitCount();
    this.setupEventListeners();
  }

  /**
   * Load state from localStorage
   */
  private loadState(): InstallPromptState {
    if (typeof window === 'undefined') {
      return this.getDefaultState();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultState(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load install prompt state:', error);
    }

    return this.getDefaultState();
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save install prompt state:', error);
    }
  }

  /**
   * Get default state
   */
  private getDefaultState(): InstallPromptState {
    return {
      canInstall: false,
      isInstalled: false,
      platform: 'unknown',
      shouldShow: false,
      visitCount: 0,
      lastShown: null,
      neverShow: false,
    };
  }

  /**
   * Detect platform
   */
  private detectPlatform(): void {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      this.state.platform = 'ios';
    } else if (isAndroid) {
      this.state.platform = 'android';
    } else {
      this.state.platform = 'desktop';
    }

    this.saveState();
  }

  /**
   * Check if app is already installed
   */
  private checkIfInstalled(): void {
    if (typeof window === 'undefined') return;

    // Check if running as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    this.state.isInstalled = isStandalone;
    this.saveState();
  }

  /**
   * Increment visit count
   */
  private incrementVisitCount(): void {
    if (this.state.isInstalled || this.state.neverShow) return;

    this.state.visitCount += 1;
    this.updateShouldShow();
    this.saveState();
  }

  /**
   * Update shouldShow based on timing rules
   */
  private updateShouldShow(): void {
    if (this.state.neverShow || this.state.isInstalled) {
      this.state.shouldShow = false;
      return;
    }

    // Check minimum visits
    if (this.state.visitCount < MIN_VISITS_BEFORE_PROMPT) {
      this.state.shouldShow = false;
      return;
    }

    // Check time since last shown
    if (this.state.lastShown) {
      const lastShownDate = new Date(this.state.lastShown);
      const daysSinceLastShown = (Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastShown < DAYS_BETWEEN_PROMPTS) {
        this.state.shouldShow = false;
        return;
      }
    }

    // Check if we can install (Android/Desktop)
    if (this.deferredPrompt || this.state.platform === 'ios') {
      this.state.shouldShow = true;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for beforeinstallprompt event (Chrome/Edge/Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.state.canInstall = true;
      this.updateShouldShow();
      this.saveState();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.state.isInstalled = true;
      this.state.canInstall = false;
      this.state.shouldShow = false;
      this.deferredPrompt = null;
      this.saveState();
      this.trackInstallEvent('accepted');
    });
  }

  /**
   * Show install prompt
   */
  async showPrompt(): Promise<'accepted' | 'dismissed' | 'not-available'> {
    if (!this.deferredPrompt) {
      return 'not-available';
    }

    this.state.lastShown = new Date().toISOString();
    this.state.shouldShow = false;
    this.saveState();

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      this.trackInstallEvent(outcome);

      if (outcome === 'accepted') {
        this.state.isInstalled = true;
        this.state.canInstall = false;
      }

      this.deferredPrompt = null;
      this.saveState();

      return outcome;
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      return 'dismissed';
    }
  }

  /**
   * Defer prompt (maybe later)
   */
  deferPrompt(): void {
    this.state.lastShown = new Date().toISOString();
    this.state.shouldShow = false;
    this.saveState();
    this.trackInstallEvent('deferred');
  }

  /**
   * Never show again
   */
  neverShowAgain(): void {
    this.state.neverShow = true;
    this.state.shouldShow = false;
    this.saveState();
    this.trackInstallEvent('never-show');
  }

  /**
   * Reset state (for testing)
   */
  reset(): void {
    this.state = this.getDefaultState();
    this.detectPlatform();
    this.saveState();
  }

  /**
   * Get current state
   */
  getState(): InstallPromptState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: InstallPromptState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  /**
   * Track install events
   */
  private trackInstallEvent(outcome: string): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: outcome,
        platform: this.state.platform,
      });
    }
  }

  /**
   * Get platform-specific instructions
   */
  getInstallInstructions(): string[] {
    switch (this.state.platform) {
      case 'ios':
        return [
          'Tap the Share button (square with arrow)',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to confirm',
        ];
      case 'android':
        return [
          'Tap the menu button (three dots)',
          'Select "Add to Home Screen"',
          'Tap "Add" to confirm',
        ];
      case 'desktop':
        return [
          'Click the install icon in the address bar',
          'Or use the menu and select "Install app"',
          'Confirm installation',
        ];
      default:
        return ["Follow your browser's install instructions"];
    }
  }
}

// Singleton instance
let installPromptManager: InstallPromptManager | null = null;

/**
 * Get install prompt manager instance
 */
export function getInstallPromptManager(): InstallPromptManager {
  if (!installPromptManager) {
    installPromptManager = new InstallPromptManager();
  }
  return installPromptManager;
}

/**
 * React hook for install prompt
 */
export function useInstallPrompt() {
  if (typeof window === 'undefined') {
    return {
      state: {
        canInstall: false,
        isInstalled: false,
        platform: 'unknown' as const,
        shouldShow: false,
        visitCount: 0,
        lastShown: null,
        neverShow: false,
      },
      showPrompt: async () => 'not-available' as const,
      deferPrompt: () => {},
      neverShowAgain: () => {},
      getInstructions: () => [],
    };
  }

  const manager = getInstallPromptManager();
  const [state, setState] = React.useState(manager.getState());

  React.useEffect(() => {
    return manager.subscribe(setState);
  }, [manager]);

  return {
    state,
    showPrompt: () => manager.showPrompt(),
    deferPrompt: () => manager.deferPrompt(),
    neverShowAgain: () => manager.neverShowAgain(),
    getInstructions: () => manager.getInstallInstructions(),
  };
}

// React import (will be added if not present)
import * as React from 'react';

export type { InstallPromptState, BeforeInstallPromptEvent };
