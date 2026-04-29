# Accessibility Testing Guide

## Overview

This guide provides comprehensive testing procedures for ensuring WCAG 2.1 Level AA accessibility compliance across the Civiq application.

## Automated Testing

### Setup

```bash
# Install accessibility testing tools
npm install --save-dev @axe-core/react axe-playwright jest-axe

# Install browser extensions
# - axe DevTools (Chrome, Firefox, Edge)
# - WAVE (Chrome, Firefox)
# - Lighthouse (built into Chrome DevTools)
```

### Running Tests

```bash
# Run accessibility tests
npm run test:a11y

# Run with coverage
npm run test:a11y --coverage

# Run specific test file
npm run test:a11y -- accessibility.test.ts
```

### Test Examples

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<LoginPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = render(<Dashboard />);
    const h1 = container.querySelector('h1');
    const h2 = container.querySelectorAll('h2');

    expect(h1).toBeInTheDocument();
    expect(h2.length).toBeGreaterThan(0);
  });

  it('should have proper form labels', async () => {
    const { container } = render(<AssessmentForm />);
    const inputs = container.querySelectorAll('input');

    inputs.forEach(input => {
      const label = container.querySelector(`label[for="${input.id}"]`);
      expect(label).toBeInTheDocument();
    });
  });
});
```

## Manual Testing Procedures

### 1. Keyboard Navigation Testing

**Objective:** Verify all functionality is accessible via keyboard

**Steps:**

1. **Tab Navigation**
   - [ ] Press Tab to move forward through interactive elements
   - [ ] Press Shift+Tab to move backward
   - [ ] Verify focus is visible on all interactive elements
   - [ ] Verify focus order is logical
   - [ ] Verify no keyboard traps (except modals)

2. **Keyboard Shortcuts**
   - [ ] Test Enter key on buttons
   - [ ] Test Space key on buttons and checkboxes
   - [ ] Test Arrow keys in menus and tabs
   - [ ] Test Escape key to close modals
   - [ ] Test Home/End keys in lists

3. **Form Navigation**
   - [ ] Tab through all form fields
   - [ ] Submit form with Enter key
   - [ ] Navigate radio buttons with Arrow keys
   - [ ] Navigate checkboxes with Space key

**Test Cases:**

```
✓ All buttons are keyboard accessible
✓ All links are keyboard accessible
✓ All form inputs are keyboard accessible
✓ All menus are keyboard accessible
✓ All modals trap focus
✓ Focus is visible on all interactive elements
✓ Focus order is logical
✓ No keyboard traps (except modals)
```

### 2. Screen Reader Testing

**Tools:**

- **Windows:** NVDA (free), JAWS (paid)
- **macOS:** VoiceOver (built-in)
- **iOS:** VoiceOver (built-in)
- **Android:** TalkBack (built-in)

**NVDA Testing (Windows)**

```bash
# Download NVDA
# https://www.nvaccess.org/download/

# Start NVDA
# Press Ctrl+Alt+N

# Common NVDA shortcuts
# Insert+Up Arrow = Read current line
# Insert+Down Arrow = Read next line
# Insert+Home = Read from top
# Insert+End = Read to bottom
# Insert+F7 = Open Elements List
```

**VoiceOver Testing (macOS)**

```bash
# Enable VoiceOver
# Cmd+F5

# Common VoiceOver shortcuts
# VO+U = Open Rotor
# VO+Right Arrow = Next item
# VO+Left Arrow = Previous item
# VO+Space = Activate item
# VO+Shift+Down Arrow = Enter group
```

**Test Cases:**

```
✓ Page title is announced
✓ Headings are announced with level
✓ Form labels are announced
✓ Form errors are announced
✓ Button purposes are clear
✓ Link purposes are clear
✓ Images have alt text
✓ Lists are announced as lists
✓ Tables have proper headers
✓ Live regions are announced
✓ Skip links are available
✓ Landmarks are announced
```

### 3. Visual Testing

**Objective:** Verify visual accessibility

**Steps:**

1. **Color Contrast**
   - [ ] Check contrast ratio with WebAIM Contrast Checker
   - [ ] Verify 4.5:1 for normal text
   - [ ] Verify 3:1 for large text (18pt+)
   - [ ] Verify 3:1 for UI components

2. **Color Blindness**
   - [ ] Test with Coblis color blindness simulator
   - [ ] Verify information is not conveyed by color alone
   - [ ] Verify icons/patterns supplement colors

3. **Zoom & Magnification**
   - [ ] Test at 100% zoom
   - [ ] Test at 150% zoom
   - [ ] Test at 200% zoom
   - [ ] Verify no horizontal scrolling at 200%
   - [ ] Verify all content is readable

4. **High Contrast Mode**
   - [ ] Enable high contrast mode (Windows)
   - [ ] Verify all elements are visible
   - [ ] Verify borders are visible
   - [ ] Verify text is readable

**Tools:**

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coblis Color Blindness Simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)
- [Accessible Colors](https://accessible-colors.com/)

**Test Cases:**

```
✓ All text has 4.5:1 contrast ratio
✓ All UI components have 3:1 contrast ratio
✓ Information is not conveyed by color alone
✓ Page is readable at 200% zoom
✓ No horizontal scrolling at 200% zoom
✓ High contrast mode is supported
✓ Dark mode is supported
```

### 4. Motion & Animation Testing

**Objective:** Verify animations respect user preferences

**Steps:**

1. **Reduced Motion**
   - [ ] Enable "Reduce motion" in OS settings
   - [ ] Verify animations are disabled
   - [ ] Verify transitions are disabled
   - [ ] Verify page is still functional

2. **Animation Performance**
   - [ ] Check for smooth animations
   - [ ] Check for no jank or stuttering
   - [ ] Check for proper frame rates

**Enable Reduced Motion:**

**Windows:**

- Settings > Ease of Access > Display > Show animations

**macOS:**

- System Preferences > Accessibility > Display > Reduce motion

**iOS:**

- Settings > Accessibility > Motion > Reduce Motion

**Android:**

- Settings > Accessibility > Remove animations

**Test Cases:**

```
✓ Animations are disabled with reduced motion
✓ Transitions are disabled with reduced motion
✓ Page is functional without animations
✓ Animations are smooth (60fps)
✓ No jank or stuttering
```

### 5. Touch Target Testing

**Objective:** Verify touch targets are large enough

**Requirements:**

- Minimum 44x44 pixels
- 8px spacing between targets

**Steps:**

1. **Measure Touch Targets**
   - [ ] Use browser DevTools to measure elements
   - [ ] Verify minimum 44x44px
   - [ ] Verify 8px spacing

2. **Test on Mobile**
   - [ ] Test on phone (5-6 inch screen)
   - [ ] Test on tablet (7-10 inch screen)
   - [ ] Verify easy to tap
   - [ ] Verify no accidental taps

**Test Cases:**

```
✓ All buttons are 44x44px minimum
✓ All links are 44x44px minimum
✓ All form inputs are 44x44px minimum
✓ Touch targets have 8px spacing
✓ Easy to tap on mobile
✓ No accidental taps
```

### 6. Form Testing

**Objective:** Verify forms are accessible

**Steps:**

1. **Labels**
   - [ ] All inputs have labels
   - [ ] Labels are associated with inputs
   - [ ] Labels are visible

2. **Errors**
   - [ ] Errors are announced
   - [ ] Errors are associated with fields
   - [ ] Errors are visible

3. **Required Fields**
   - [ ] Required fields are marked
   - [ ] Required fields are announced
   - [ ] Validation is clear

4. **Placeholders**
   - [ ] Placeholders are not used as labels
   - [ ] Placeholders are visible
   - [ ] Placeholders disappear on focus

**Test Cases:**

```
✓ All inputs have labels
✓ Labels are associated with inputs
✓ Errors are announced
✓ Errors are associated with fields
✓ Required fields are marked
✓ Validation is clear
✓ Placeholders are not used as labels
```

### 7. Heading & Structure Testing

**Objective:** Verify proper document structure

**Steps:**

1. **Heading Hierarchy**
   - [ ] Only one H1 per page
   - [ ] No skipped heading levels
   - [ ] Headings describe content
   - [ ] Headings are not used for styling

2. **Landmarks**
   - [ ] Header landmark present
   - [ ] Navigation landmark present
   - [ ] Main landmark present
   - [ ] Footer landmark present

3. **Lists**
   - [ ] Lists use proper list elements
   - [ ] List items are properly nested
   - [ ] Lists are announced as lists

**Test Cases:**

```
✓ Only one H1 per page
✓ No skipped heading levels
✓ Headings describe content
✓ Landmarks are present
✓ Lists use proper elements
✓ Lists are announced
```

### 8. Link Testing

**Objective:** Verify links are accessible

**Steps:**

1. **Link Text**
   - [ ] Links have descriptive text
   - [ ] "Click here" links are avoided
   - [ ] Link purpose is clear

2. **Link Styling**
   - [ ] Links are visually distinct
   - [ ] Links have underlines or other indicators
   - [ ] Links have focus indicators

3. **Link Behavior**
   - [ ] Links open in same window by default
   - [ ] New window links are announced
   - [ ] External links are announced

**Test Cases:**

```
✓ Links have descriptive text
✓ Links are visually distinct
✓ Links have focus indicators
✓ New window links are announced
✓ External links are announced
```

### 9. Image Testing

**Objective:** Verify images are accessible

**Steps:**

1. **Alt Text**
   - [ ] All images have alt text
   - [ ] Alt text is descriptive
   - [ ] Decorative images have empty alt text
   - [ ] Complex images have long descriptions

2. **Image Links**
   - [ ] Image links have alt text
   - [ ] Alt text describes link purpose
   - [ ] No "image" or "picture" in alt text

**Test Cases:**

```
✓ All images have alt text
✓ Alt text is descriptive
✓ Decorative images have empty alt text
✓ Complex images have descriptions
✓ Image links have alt text
```

### 10. Table Testing

**Objective:** Verify tables are accessible

**Steps:**

1. **Table Structure**
   - [ ] Tables have headers
   - [ ] Headers use TH elements
   - [ ] Headers have scope attribute
   - [ ] Data cells use TD elements

2. **Table Content**
   - [ ] Tables have captions
   - [ ] Tables have summaries
   - [ ] Complex tables have descriptions

**Test Cases:**

```
✓ Tables have headers
✓ Headers use TH elements
✓ Headers have scope attribute
✓ Tables have captions
✓ Complex tables have descriptions
```

## Accessibility Audit Checklist

### Perceivable

- [ ] All images have alt text
- [ ] All videos have captions
- [ ] All audio has transcripts
- [ ] Color contrast is 4.5:1 for text
- [ ] Color contrast is 3:1 for UI components
- [ ] Information is not conveyed by color alone
- [ ] Text can be resized
- [ ] Page is readable at 200% zoom

### Operable

- [ ] All functionality is keyboard accessible
- [ ] Focus is visible
- [ ] Focus order is logical
- [ ] No keyboard traps (except modals)
- [ ] Touch targets are 44x44px minimum
- [ ] Links have descriptive text
- [ ] Forms have labels
- [ ] Errors are announced

### Understandable

- [ ] Page title is descriptive
- [ ] Headings describe content
- [ ] Headings follow proper hierarchy
- [ ] Language is clear and simple
- [ ] Instructions are clear
- [ ] Error messages are clear
- [ ] Form labels are clear
- [ ] Abbreviations are explained

### Robust

- [ ] HTML is valid
- [ ] ARIA is used correctly
- [ ] Landmarks are present
- [ ] Semantic HTML is used
- [ ] No duplicate IDs
- [ ] No duplicate landmarks
- [ ] Roles are used correctly
- [ ] States are announced

## Continuous Testing

### Pre-Commit

```bash
# Run accessibility tests before commit
npm run test:a11y
npm run lint:a11y
```

### CI/CD Pipeline

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:a11y
      - run: npm run lint:a11y
```

### Regular Audits

- Weekly automated testing
- Monthly manual testing
- Quarterly expert review
- Annual third-party audit

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [The A11Y Project](https://www.a11yproject.com/)
- [Deque University](https://dequeuniversity.com/)
- [Accessibility Insights](https://accessibilityinsights.io/)

## Support

For accessibility testing questions or issues:

1. Check this guide
2. Review WCAG 2.1 guidelines
3. Use automated testing tools
4. Perform manual testing
5. Contact accessibility team

---

**Last Updated**: April 2026
**Version**: 1.0.0
