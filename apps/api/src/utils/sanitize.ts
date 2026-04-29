/**
 * Sanitize user input to prevent prompt injection attacks
 * Escapes special characters that could be used to break out of prompts
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/\\/g, '\\\\')      // Escape backslashes
    .replace(/"/g, '\\"')        // Escape double quotes
    .replace(/'/g, "\\'")        // Escape single quotes
    .replace(/\n/g, '\\n')       // Escape newlines
    .replace(/\r/g, '\\r')       // Escape carriage returns
    .replace(/\t/g, '\\t')       // Escape tabs
    .replace(/\0/g, '\\0');      // Escape null bytes
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // Remove script tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')                          // Remove event handlers
    .replace(/javascript:/gi, '')                                          // Remove javascript: protocol
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ''); // Remove iframe tags
}

/**
 * Validate and sanitize user location data
 * Prevents injection attacks through location field
 */
export function sanitizeLocation(location: string): string {
  if (!location || typeof location !== 'string') {
    return '';
  }

  // Allow only alphanumeric, spaces, hyphens, and commas
  return location
    .replace(/[^a-zA-Z0-9\s\-,]/g, '')
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Truncate string to maximum length
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.substring(0, maxLength);
}
