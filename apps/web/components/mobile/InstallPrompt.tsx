'use client';

/**
 * PWA Install Prompt Component
 *
 * Attractive install banner that shows at smart times
 * with platform-specific instructions and benefits.
 */

import * as React from 'react';
import { X, Download, Smartphone, Zap, Bell } from 'lucide-react';
import { useInstallPrompt } from '@/lib/pwa/install-prompt';

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function InstallPrompt({ onInstall, onDismiss }: InstallPromptProps) {
  const { state, showPrompt, deferPrompt, neverShowAgain, getInstructions } =
    useInstallPrompt();
  const [isVisible, setIsVisible] = React.useState(false);
  const [showInstructions, setShowInstructions] = React.useState(false);

  // Show prompt after a delay if shouldShow is true
  // eslint-disable-next-line react-compiler/react-compiler
  React.useEffect(() => {
    if (state.shouldShow) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000); // Wait 2 seconds before showing

      return () => clearTimeout(timer);
    }
  }, [state.shouldShow]);

  // Don't render if shouldn't show or already installed
  if (!isVisible || state.isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    if (state.platform === 'ios') {
      // Show instructions for iOS
      setShowInstructions(true);
    } else {
      // Show native prompt for Android/Desktop
      const outcome = await showPrompt();

      if (outcome === 'accepted') {
        setIsVisible(false);
        onInstall?.();
      }
    }
  };

  const handleMaybeLater = () => {
    deferPrompt();
    setIsVisible(false);
    onDismiss?.();
  };

  const handleNeverShow = () => {
    neverShowAgain();
    setIsVisible(false);
    onDismiss?.();
  };

  const handleClose = () => {
    setIsVisible(false);
    handleMaybeLater();
  };

  // Show instructions modal for iOS
  if (showInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Install App
            </h3>
            <button
              onClick={() => {
                setShowInstructions(false);
                handleMaybeLater();
              }}
              className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Follow these steps to install the app on your device:
            </p>

            <ol className="space-y-3">
              {getInstructions().map((instruction, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{instruction}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={() => {
                setShowInstructions(false);
                handleMaybeLater();
              }}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main install prompt banner
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-7xl p-4">
        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Install Tournament App
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Get the full experience with these benefits:
            </p>

            {/* Benefits */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Faster</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <Download className="h-4 w-4 text-green-500" />
                <span>Offline</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <Bell className="h-4 w-4 text-blue-500" />
                <span>Alerts</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:flex-none"
              >
                Install Now
              </button>
              <button
                onClick={handleMaybeLater}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:flex-none"
              >
                Maybe Later
              </button>
              <button
                onClick={handleNeverShow}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Never show
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Install Button
 * Can be placed in navigation or settings
 */
export function InstallButton({ className = '' }: { className?: string }) {
  const { state, showPrompt } = useInstallPrompt();
  const [isInstalling, setIsInstalling] = React.useState(false);

  if (state.isInstalled || !state.canInstall) {
    return null;
  }

  const handleClick = async () => {
    setIsInstalling(true);
    await showPrompt();
    setIsInstalling(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isInstalling}
      className={`flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 ${className}`}
    >
      <Download className="h-4 w-4" />
      {isInstalling ? 'Installing...' : 'Install App'}
    </button>
  );
}
