'use client';

/**
 * Accessibility Preferences Hook
 * Manages user accessibility preferences and settings
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
  announceToScreenReader,
  LiveRegion,
} from '@/lib/accessibility';

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  darkMode: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  screenReaderMode: boolean;
  focusIndicator: 'standard' | 'enhanced';
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  darkMode: false,
  fontSize: 'normal',
  screenReaderMode: false,
  focusIndicator: 'standard',
  colorBlindMode: 'none',
};

const STORAGE_KEY = 'civiq-accessibility-preferences';

export function useAccessibility() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);
  const liveRegionRef = React.useRef<LiveRegion | null>(null);

  // Load preferences from localStorage and system settings
  useEffect(() => {
    const loadPreferences = () => {
      try {
        // Load from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } else {
          // Use system preferences
          const systemPrefs: AccessibilityPreferences = {
            ...DEFAULT_PREFERENCES,
            reducedMotion: prefersReducedMotion(),
            highContrast: prefersHighContrast(),
            darkMode: prefersDarkMode(),
          };
          setPreferences(systemPrefs);
        }
      } catch (error) {
        console.error('Failed to load accessibility preferences:', error);
      }
      setIsLoaded(true);
    };

    loadPreferences();

    // Create live region for announcements
    liveRegionRef.current = new LiveRegion('polite');

    return () => {
      liveRegionRef.current?.destroy();
    };
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: Partial<AccessibilityPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      announceToScreenReader('Accessibility preferences updated');
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    }
  }, [preferences]);

  // Update individual preference
  const updatePreference = useCallback(
    <K extends keyof AccessibilityPreferences>(
      key: K,
      value: AccessibilityPreferences[K]
    ) => {
      savePreferences({ [key]: value });
    },
    [savePreferences]
  );

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
      announceToScreenReader('Accessibility preferences reset to defaults');
    } catch (error) {
      console.error('Failed to reset accessibility preferences:', error);
    }
  }, []);

  // Apply preferences to DOM
  useEffect(() => {
    if (!isLoaded) return;

    const root = document.documentElement;

    // Font size
    root.style.fontSize = preferences.fontSize === 'large' ? '18px' : preferences.fontSize === 'extra-large' ? '20px' : '16px';

    // Dark mode
    if (preferences.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // High contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Screen reader mode
    if (preferences.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }

    // Focus indicator
    if (preferences.focusIndicator === 'enhanced') {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }

    // Color blind mode
    if (preferences.colorBlindMode !== 'none') {
      root.classList.add(`color-blind-${preferences.colorBlindMode}`);
    } else {
      root.classList.remove('color-blind-protanopia', 'color-blind-deuteranopia', 'color-blind-tritanopia');
    }
  }, [preferences, isLoaded]);

  // Announce preference changes
  const announcePreferenceChange = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.announce(message);
    }
  }, []);

  return {
    preferences,
    isLoaded,
    updatePreference,
    savePreferences,
    resetPreferences,
    announcePreferenceChange,
  };
}

/**
 * Context for accessibility preferences
 */
export const AccessibilityContext = React.createContext<ReturnType<typeof useAccessibility> | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const accessibility = useAccessibility();

  return (
    <AccessibilityContext.Provider value={accessibility}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityContext() {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
}
