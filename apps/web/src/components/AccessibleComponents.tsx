/**
 * Accessible Component Wrappers
 * WCAG 2.1 AA compliant components
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  generateId,
  prefersReducedMotion,
  announceToScreenReader,
  keyboardNavigation,
  focusManagement,
} from '@/lib/accessibility';

/**
 * Skip to Main Content link
 */
export const SkipToMain: React.FC<{ targetId: string }> = ({ targetId }) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[9999] focus:p-4 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  >
    Skip to main content
  </a>
);

/**
 * Accessible Button Component
 */
export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  loading?: boolean;
  loadingText?: string;
}

export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      ariaLabel,
      ariaDescribedBy,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      loading = false,
      loadingText = 'Loading',
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-busy={loading}
        disabled={disabled || loading}
        className={`
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${className}
        `}
        {...props}
      >
        {loading ? loadingText : children}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

/**
 * Accessible Form Input Component
 */
export interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, error, hint, required, id, className = '', ...props }, ref) => {
    const inputId = id || generateId('input');
    const errorId = generateId('error');
    const hintId = generateId('hint');

    return (
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="text-red-600 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim()}
          aria-invalid={!!error}
          required={required}
          className={`
            w-full px-4 py-2 rounded-lg border-2 border-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-slate-100 disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && (
          <p id={hintId} className="text-sm text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

/**
 * Accessible Select Component
 */
export interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const AccessibleSelect = React.forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({ label, options, error, hint, required, id, className = '', ...props }, ref) => {
    const selectId = id || generateId('select');
    const errorId = generateId('error');
    const hintId = generateId('hint');

    return (
      <div className="space-y-2">
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="text-red-600 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim()}
          aria-invalid={!!error}
          required={required}
          className={`
            w-full px-4 py-2 rounded-lg border-2 border-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-slate-100 disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && (
          <p id={hintId} className="text-sm text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';

/**
 * Accessible Checkbox Component
 */
export interface AccessibleCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const AccessibleCheckbox = React.forwardRef<HTMLInputElement, AccessibleCheckboxProps>(
  ({ label, hint, id, className = '', ...props }, ref) => {
    const checkboxId = id || generateId('checkbox');
    const hintId = generateId('hint');

    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          aria-describedby={hint ? hintId : undefined}
          className={`
            w-5 h-5 rounded border-2 border-slate-300 text-blue-600
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${className}
          `}
          {...props}
        />
        <div className="flex-1">
          <label htmlFor={checkboxId} className="text-sm font-medium text-slate-700 cursor-pointer">
            {label}
          </label>
          {hint && (
            <p id={hintId} className="text-sm text-slate-500 mt-1">
              {hint}
            </p>
          )}
        </div>
      </div>
    );
  }
);

AccessibleCheckbox.displayName = 'AccessibleCheckbox';

/**
 * Accessible Radio Group Component
 */
export interface AccessibleRadioGroupProps {
  legend: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  name: string;
}

export const AccessibleRadioGroup: React.FC<AccessibleRadioGroupProps> = ({
  legend,
  options,
  value,
  onChange,
  error,
  required,
  name,
}) => {
  const errorId = generateId('error');

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">
        {legend}
        {required && (
          <span className="text-red-600 ml-1" aria-label="required">
            *
          </span>
        )}
      </legend>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-start gap-3">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={!!error}
              className={`
                w-5 h-5 rounded-full border-2 border-slate-300 text-blue-600
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
                mt-0.5
              `}
            />
            <div className="flex-1">
              <label
                htmlFor={`${name}-${option.value}`}
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                {option.label}
              </label>
              {option.hint && <p className="text-sm text-slate-500 mt-1">{option.hint}</p>}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

/**
 * Accessible Modal Component
 */
export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeButtonLabel?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  closeButtonLabel = 'Close',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = generateId('modal-title');

  useEffect(() => {
    if (!isOpen) return;

    const restoreFocus = focusManagement.saveFocus();

    // Focus the modal container initially for screen readers
    modalRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (keyboardNavigation.isEscapeKey(e.key)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    // Trap focus within the modal
    if (modalRef.current) {
      focusManagement.trapFocus(modalRef.current);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
      restoreFocus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
      >
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 id={titleId} className="text-xl font-bold text-slate-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label={closeButtonLabel}
              className="text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              ✕
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </>
  );
};

/**
 * Accessible Alert Component
 */
export interface AccessibleAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
}

export const AccessibleAlert: React.FC<AccessibleAlertProps> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const alertId = generateId('alert');
  const typeConfig = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✓' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '✕' },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠',
    },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ' },
  };

  const config = typeConfig[type];

  return (
    <div
      id={alertId}
      role="alert"
      aria-atomic="true"
      className={`${config.bg} border-l-4 ${config.border} p-4 rounded-md ${config.text}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl font-bold">{config.icon}</span>
        <div className="flex-1">
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm mt-1">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close alert"
            className="text-lg hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Accessible Tabs Component
 */
export interface AccessibleTabsProps {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
  defaultTabId?: string;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({ tabs, defaultTabId }) => {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    const tabIds = tabs.map((t) => t.id);
    const currentIndex = tabIds.indexOf(tabId);

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? tabIds.length - 1 : currentIndex - 1;
      setActiveTabId(tabIds[prevIndex]);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex === tabIds.length - 1 ? 0 : currentIndex + 1;
      setActiveTabId(tabIds[nextIndex]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTabId(tabIds[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTabId(tabIds[tabIds.length - 1]);
    }
  };

  return (
    <div>
      <div ref={tabListRef} role="tablist" className="flex border-b border-slate-200 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTabId === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTabId === tab.id ? 0 : -1}
            onClick={() => setActiveTabId(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={`
              px-4 py-2 font-medium border-b-2 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${
                activeTabId === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTabId !== tab.id}
            className="p-4"
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Accessible Tooltip Component
 */
export interface AccessibleTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = generateId('tooltip');

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-md
            whitespace-nowrap pointer-events-none
            ${
              position === 'top'
                ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
                : position === 'bottom'
                  ? 'top-full left-1/2 -translate-x-1/2 mt-2'
                  : position === 'left'
                    ? 'right-full top-1/2 -translate-y-1/2 mr-2'
                    : 'left-full top-1/2 -translate-y-1/2 ml-2'
            }
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};
