/**
 * Accessibility Utilities
 * Provides helpers for WCAG 2.1 AA compliance
 */

/**
 * Generate unique IDs for aria-labelledby and aria-describedby
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Trap focus within an element
   */
  trapFocus(element: HTMLElement): void {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    element.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    });
  },

  /**
   * Restore focus to previously focused element
   */
  saveFocus(): () => void {
    const previouslyFocused = document.activeElement as HTMLElement;
    return () => {
      previouslyFocused?.focus();
    };
  },
};

/**
 * Keyboard navigation helpers
 */
export const keyboardNavigation = {
  /**
   * Check if key is Enter or Space
   */
  isActivationKey(key: string): boolean {
    return key === 'Enter' || key === ' ';
  },

  /**
   * Check if key is arrow key
   */
  isArrowKey(key: string): boolean {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
  },

  /**
   * Check if key is Escape
   */
  isEscapeKey(key: string): boolean {
    return key === 'Escape';
  },
};

/**
 * Color contrast checker (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
 */
export function getContrastRatio(rgb1: string, rgb2: string): number {
  const getLuminance = (rgb: string): number => {
    const [r, g, b] = rgb.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Skip link helper - creates skip link element
 */
export function createSkipLink(targetId: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className =
    'sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:rounded-md';
  link.textContent = 'Skip to main content';
  return link;
}

/**
 * Live region announcements for dynamic content
 */
export class LiveRegion {
  private element: HTMLDivElement;

  constructor(priority: 'polite' | 'assertive' = 'polite') {
    this.element = document.createElement('div');
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', priority);
    this.element.setAttribute('aria-atomic', 'true');
    this.element.className = 'sr-only';
    document.body.appendChild(this.element);
  }

  announce(message: string): void {
    this.element.textContent = message;
  }

  clear(): void {
    this.element.textContent = '';
  }

  destroy(): void {
    document.body.removeChild(this.element);
  }
}

/**
 * Tooltip accessibility helper
 */
export function createAccessibleTooltip(triggerElement: HTMLElement, tooltipText: string): void {
  const tooltipId = generateId('tooltip');
  triggerElement.setAttribute('aria-describedby', tooltipId);

  const tooltip = document.createElement('div');
  tooltip.id = tooltipId;
  tooltip.className = 'sr-only';
  tooltip.textContent = tooltipText;
  triggerElement.appendChild(tooltip);
}

/**
 * Form validation announcements
 */
export function announceFormError(fieldName: string, errorMessage: string): void {
  announceToScreenReader(`${fieldName} error: ${errorMessage}`, 'assertive');
}

/**
 * Page title update for screen readers
 */
export function updatePageTitle(title: string): void {
  document.title = title;
  announceToScreenReader(title, 'assertive');
}

/**
 * Announce AI simulation states (start, completion, error)
 */
export const simulationAnnouncer = {
  start(processName: string): void {
    announceToScreenReader(`Starting ${processName}. Please wait.`, 'polite');
  },
  complete(processName: string): void {
    announceToScreenReader(`${processName} completed successfully.`, 'assertive');
  },
  error(processName: string, errorMessage: string): void {
    announceToScreenReader(`Error in ${processName}: ${errorMessage}`, 'assertive');
  },
};
