# Accessibility Implementation Guide

## Overview

Civiq is committed to WCAG 2.1 Level AA accessibility compliance. This document outlines the accessibility features implemented across the application.

## Compliance Standards

- **WCAG 2.1 Level AA**: All pages and components meet WCAG 2.1 Level AA standards
- **Section 508**: Compliant with Section 508 of the Rehabilitation Act
- **ADA**: Accessible to users with disabilities under the Americans with Disabilities Act
- **EN 301 549**: European accessibility standard compliance

## Key Accessibility Features

### 1. Semantic HTML & Landmarks

All pages use proper semantic HTML structure:

```html
<html lang="en">
  <header role="banner">Navigation</header>
  <nav role="navigation">Main navigation</nav>
  <main id="main-content" role="main">Primary content</main>
  <aside role="complementary">Sidebar content</aside>
  <footer role="contentinfo">Footer</footer>
</html>
```

**Benefits:**

- Screen readers can navigate page structure
- Users can jump to main content
- Proper document outline

### 2. Keyboard Navigation

Full keyboard navigation support:

- **Tab**: Move focus forward
- **Shift+Tab**: Move focus backward
- **Enter/Space**: Activate buttons
- **Arrow Keys**: Navigate menus, tabs, sliders
- **Escape**: Close modals, menus
- **Home/End**: Jump to first/last item

**Implementation:**

```typescript
import { keyboardNavigation } from '@/lib/accessibility';

if (keyboardNavigation.isActivationKey(e.key)) {
  handleActivation();
}
```

### 3. Focus Management

- **Focus Visible**: Clear 3px blue outline on all interactive elements
- **Focus Trap**: Modals trap focus within the dialog
- **Focus Restoration**: Focus returns to trigger element when modal closes
- **Skip Links**: "Skip to main content" link at top of page

**CSS:**

```css
:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```

### 4. Screen Reader Support

#### ARIA Labels & Descriptions

All interactive elements have proper labels:

```tsx
<button aria-label="Close menu">✕</button>
<input aria-describedby="email-hint" />
<div id="email-hint">Enter your email address</div>
```

#### Live Regions

Dynamic content updates announced to screen readers:

```typescript
import { LiveRegion } from '@/lib/accessibility';

const liveRegion = new LiveRegion('polite');
liveRegion.announce('Step marked as complete!');
```

#### Form Validation

Errors announced immediately:

```typescript
import { announceFormError } from '@/lib/accessibility';

announceFormError('Email', 'Invalid email format');
```

### 5. Color & Contrast

#### WCAG AA Contrast Requirements

- **Normal text**: 4.5:1 contrast ratio
- **Large text** (18pt+): 3:1 contrast ratio
- **UI components**: 3:1 contrast ratio

#### Color Not Sole Means

Information is never conveyed by color alone:

```tsx
// ✓ Good: Icon + color
<span className="text-red-600">
  <AlertIcon /> Error
</span>

// ✗ Bad: Color only
<span className="text-red-600">Error</span>
```

#### High Contrast Mode

Automatic adjustments for users with `prefers-contrast: more`:

```css
@media (prefers-contrast: more) {
  button {
    border-width: 2px;
    border-color: #000000;
  }
}
```

### 6. Reduced Motion

Respects user's motion preferences:

```typescript
import { prefersReducedMotion } from '@/lib/accessibility';

const shouldAnimate = !prefersReducedMotion();
```

**CSS:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7. Touch Targets

All interactive elements meet minimum size requirements:

- **Minimum size**: 44x44 pixels
- **Spacing**: 8px minimum between targets
- **Mobile friendly**: Optimized for touch on all devices

```css
button,
a[role='button'],
input[type='checkbox'],
input[type='radio'] {
  min-height: 44px;
  min-width: 44px;
}
```

### 8. Text Sizing & Readability

- **Minimum font size**: 12px (14px preferred)
- **Line height**: 1.5 minimum
- **Letter spacing**: 0.12em minimum
- **Word spacing**: 0.16em minimum
- **Zoom support**: Up to 200% without loss of functionality

### 9. Headings & Document Structure

Proper heading hierarchy:

```tsx
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

**Rules:**

- Only one `<h1>` per page
- No skipped heading levels
- Headings describe content
- Headings are not used for styling

### 10. Form Accessibility

#### Labels

All form inputs have associated labels:

```tsx
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />
```

#### Error Messages

Errors are associated with fields:

```tsx
<input aria-invalid="true" aria-describedby="email-error" />
<p id="email-error" role="alert">Invalid email format</p>
```

#### Required Fields

Required fields are clearly marked:

```tsx
<label>
  Email Address
  <span aria-label="required">*</span>
</label>
```

### 11. Images & Media

#### Alt Text

All images have descriptive alt text:

```tsx
<img src="chart.png" alt="Election readiness score: 75%" />
```

#### Decorative Images

Decorative images are hidden from screen readers:

```tsx
<img src="decoration.png" alt="" aria-hidden="true" />
```

#### Video & Audio

All video and audio content has captions and transcripts:

```tsx
<video>
  <source src="video.mp4" type="video/mp4" />
  <track kind="captions" src="captions.vtt" />
</video>
```

### 12. Links

#### Link Text

Links have descriptive text:

```tsx
// ✓ Good
<a href="/assessment">Start Readiness Assessment</a>

// ✗ Bad
<a href="/assessment">Click here</a>
```

#### Link Purpose

Link purpose is clear from context:

```tsx
<a href="/verify" aria-label="Verify election myths">
  Myth-Check Lab
</a>
```

### 13. Tables

Proper table structure:

```tsx
<table>
  <thead>
    <tr>
      <th scope="col">Deadline</th>
      <th scope="col">Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>October 15</td>
      <td>Register to vote</td>
    </tr>
  </tbody>
</table>
```

### 14. Lists

Proper list structure:

```tsx
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
```

### 15. Modals & Dialogs

Accessible modal implementation:

```tsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Action</h2>
  <p>Are you sure?</p>
</div>
```

**Features:**

- Focus trap within modal
- Escape key closes modal
- Focus returns to trigger
- Backdrop is not interactive

## Accessible Components

### AccessibleButton

```tsx
import { AccessibleButton } from '@/components/AccessibleComponents';

<AccessibleButton ariaLabel="Close menu" onClick={handleClose}>
  ✕
</AccessibleButton>;
```

### AccessibleInput

```tsx
import { AccessibleInput } from '@/components/AccessibleComponents';

<AccessibleInput
  label="Email Address"
  type="email"
  required
  error={emailError}
  hint="We'll never share your email"
/>;
```

### AccessibleSelect

```tsx
import { AccessibleSelect } from '@/components/AccessibleComponents';

<AccessibleSelect
  label="Voting Status"
  options={[
    { value: 'registered', label: 'Already Registered' },
    { value: 'not-registered', label: 'Not Registered' },
  ]}
  required
/>;
```

### AccessibleCheckbox

```tsx
import { AccessibleCheckbox } from '@/components/AccessibleComponents';

<AccessibleCheckbox label="I agree to the terms" hint="You must agree to continue" />;
```

### AccessibleRadioGroup

```tsx
import { AccessibleRadioGroup } from '@/components/AccessibleComponents';

<AccessibleRadioGroup
  legend="Voting Method"
  name="voting-method"
  options={[
    { value: 'in-person', label: 'In-Person Voting' },
    { value: 'mail', label: 'Mail-In Ballot' },
  ]}
  required
/>;
```

### AccessibleModal

```tsx
import { AccessibleModal } from '@/components/AccessibleComponents';

<AccessibleModal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
  <p>Are you sure you want to proceed?</p>
</AccessibleModal>;
```

### AccessibleAlert

```tsx
import { AccessibleAlert } from '@/components/AccessibleComponents';

<AccessibleAlert
  type="success"
  title="Success"
  message="Your assessment has been saved"
  onClose={handleClose}
/>;
```

### AccessibleTabs

```tsx
import { AccessibleTabs } from '@/components/AccessibleComponents';

<AccessibleTabs
  tabs={[
    { id: 'tab1', label: 'Overview', content: <Overview /> },
    { id: 'tab2', label: 'Details', content: <Details /> },
  ]}
/>;
```

### AccessibleTooltip

```tsx
import { AccessibleTooltip } from '@/components/AccessibleComponents';

<AccessibleTooltip content="Click to learn more">
  <button>?</button>
</AccessibleTooltip>;
```

## Testing Accessibility

### Automated Testing

```bash
# Run accessibility tests
npm run test:a11y

# Check contrast ratios
npm run test:contrast

# Validate HTML
npm run test:html
```

### Manual Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus is visible
   - Test all keyboard shortcuts

2. **Screen Reader Testing**
   - Use NVDA (Windows) or JAWS
   - Use VoiceOver (macOS/iOS)
   - Use TalkBack (Android)

3. **Visual Testing**
   - Check color contrast with WebAIM
   - Test with high contrast mode
   - Test with reduced motion enabled

4. **Mobile Testing**
   - Test touch targets (44x44px minimum)
   - Test zoom up to 200%
   - Test with screen reader

### Tools

- **axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Built-in Chrome DevTools accessibility audit
- **NVDA**: Free screen reader for Windows
- **VoiceOver**: Built-in screen reader for macOS/iOS
- **WebAIM**: Contrast checker and resources

## Accessibility Checklist

- [ ] All pages have proper semantic HTML
- [ ] All interactive elements are keyboard accessible
- [ ] Focus is visible on all interactive elements
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] All form errors are announced
- [ ] Color contrast meets WCAG AA standards
- [ ] Reduced motion is respected
- [ ] Touch targets are 44x44px minimum
- [ ] Headings follow proper hierarchy
- [ ] Links have descriptive text
- [ ] Tables have proper structure
- [ ] Lists have proper structure
- [ ] Modals trap focus
- [ ] Skip links are present
- [ ] Page titles are descriptive
- [ ] Language is set on html element
- [ ] Viewport is not locked
- [ ] Text can be resized
- [ ] No information by color alone

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [The A11Y Project](https://www.a11yproject.com/)
- [Accessible Colors](https://accessible-colors.com/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Support

For accessibility issues or questions:

1. Check the [Accessibility Checklist](#accessibility-checklist)
2. Review the [Accessible Components](#accessible-components) section
3. Test with [Tools](#tools)
4. Contact the accessibility team

## Continuous Improvement

Accessibility is an ongoing process. We regularly:

- Audit the application for accessibility issues
- Update components based on user feedback
- Test with real assistive technologies
- Stay current with WCAG guidelines
- Train developers on accessibility best practices

---

**Last Updated**: April 2026
**Compliance Level**: WCAG 2.1 Level AA
**Status**: ✅ Compliant
