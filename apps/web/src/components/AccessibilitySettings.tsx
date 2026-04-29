'use client';

import React from 'react';
import { useAccessibilityContext } from '@/hooks/useAccessibility';
import { AccessibleButton, AccessibleCheckbox, AccessibleRadioGroup, AccessibleSelect } from './AccessibleComponents';
import { GlassCard } from '@civiq/ui';

export function AccessibilitySettings() {
  const { preferences, updatePreference, resetPreferences, announcePreferenceChange } = useAccessibilityContext();

  const handleFontSizeChange = (size: 'normal' | 'large' | 'extra-large') => {
    updatePreference('fontSize', size);
    const sizeLabel = size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'Extra Large';
    announcePreferenceChange(`Font size changed to ${sizeLabel}`);
  };

  const handleColorBlindModeChange = (mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') => {
    updatePreference('colorBlindMode', mode);
    const modeLabel = mode === 'none' ? 'None' : mode.charAt(0).toUpperCase() + mode.slice(1);
    announcePreferenceChange(`Color blind mode changed to ${modeLabel}`);
  };

  const handleFocusIndicatorChange = (indicator: 'standard' | 'enhanced') => {
    updatePreference('focusIndicator', indicator);
    const indicatorLabel = indicator === 'standard' ? 'Standard' : 'Enhanced';
    announcePreferenceChange(`Focus indicator changed to ${indicatorLabel}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Accessibility Settings</h2>
        <p className="text-slate-600 mb-6">
          Customize your experience to match your accessibility needs.
        </p>
      </div>

      <GlassCard className="p-6 space-y-6">
        {/* Motion Preferences */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Motion & Animation</h3>
          <AccessibleCheckbox
            label="Reduce motion"
            hint="Minimizes animations and transitions"
            checked={preferences.reducedMotion}
            onChange={(e) => {
              updatePreference('reducedMotion', e.target.checked);
              announcePreferenceChange(
                e.target.checked ? 'Motion reduced' : 'Motion enabled'
              );
            }}
          />
        </div>

        {/* Contrast Preferences */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Contrast & Colors</h3>
          <AccessibleCheckbox
            label="High contrast mode"
            hint="Increases contrast for better visibility"
            checked={preferences.highContrast}
            onChange={(e) => {
              updatePreference('highContrast', e.target.checked);
              announcePreferenceChange(
                e.target.checked ? 'High contrast enabled' : 'High contrast disabled'
              );
            }}
          />

          <AccessibleRadioGroup
            legend="Color blind mode"
            name="color-blind-mode"
            value={preferences.colorBlindMode}
            onChange={(value) => handleColorBlindModeChange(value as any)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
              { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
              { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' },
            ]}
          />
        </div>

        {/* Text & Display */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Text & Display</h3>

          <AccessibleRadioGroup
            legend="Font size"
            name="font-size"
            value={preferences.fontSize}
            onChange={(value) => handleFontSizeChange(value as any)}
            options={[
              { value: 'normal', label: 'Normal (16px)', hint: 'Default font size' },
              { value: 'large', label: 'Large (18px)', hint: 'Larger text for easier reading' },
              { value: 'extra-large', label: 'Extra Large (20px)', hint: 'Maximum text size' },
            ]}
          />

          <AccessibleCheckbox
            label="Dark mode"
            hint="Reduces eye strain in low-light environments"
            checked={preferences.darkMode}
            onChange={(e) => {
              updatePreference('darkMode', e.target.checked);
              announcePreferenceChange(
                e.target.checked ? 'Dark mode enabled' : 'Dark mode disabled'
              );
            }}
          />
        </div>

        {/* Focus & Navigation */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Focus & Navigation</h3>

          <AccessibleRadioGroup
            legend="Focus indicator"
            name="focus-indicator"
            value={preferences.focusIndicator}
            onChange={(value) => handleFocusIndicatorChange(value as any)}
            options={[
              { value: 'standard', label: 'Standard', hint: 'Default focus outline' },
              { value: 'enhanced', label: 'Enhanced', hint: 'Thicker, more visible outline' },
            ]}
          />
        </div>

        {/* Screen Reader */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Screen Reader</h3>
          <AccessibleCheckbox
            label="Screen reader mode"
            hint="Optimizes interface for screen reader users"
            checked={preferences.screenReaderMode}
            onChange={(e) => {
              updatePreference('screenReaderMode', e.target.checked);
              announcePreferenceChange(
                e.target.checked ? 'Screen reader mode enabled' : 'Screen reader mode disabled'
              );
            }}
          />
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t border-slate-200">
          <AccessibleButton
            onClick={() => {
              resetPreferences();
              announcePreferenceChange('Accessibility settings reset to defaults');
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium"
            ariaLabel="Reset all accessibility settings to defaults"
          >
            Reset to Defaults
          </AccessibleButton>
        </div>
      </GlassCard>

      {/* Information Section */}
      <GlassCard className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-3">Accessibility Information</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <strong>Keyboard Navigation:</strong> Use Tab to navigate, Enter/Space to activate, Arrow keys for menus
          </li>
          <li>
            <strong>Screen Readers:</strong> All content is labeled and structured for screen reader compatibility
          </li>
          <li>
            <strong>Color Contrast:</strong> All text meets WCAG AA standards (4.5:1 for normal text)
          </li>
          <li>
            <strong>Text Resizing:</strong> You can zoom up to 200% without loss of functionality
          </li>
          <li>
            <strong>Motion:</strong> Animations respect your motion preferences
          </li>
        </ul>
      </GlassCard>

      {/* Support Section */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
        <p className="text-slate-600 mb-4">
          If you encounter any accessibility issues or have suggestions for improvement, please contact us.
        </p>
        <AccessibleButton
          onClick={() => {
            window.location.href = 'mailto:accessibility@civiq.app';
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          ariaLabel="Send accessibility feedback email"
        >
          Report Accessibility Issue
        </AccessibleButton>
      </GlassCard>
    </div>
  );
}
