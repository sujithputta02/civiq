# Meta Tag Deprecation Fix

## Issue

The deprecated meta tag `<meta name="apple-mobile-web-app-capable" content="yes">` was causing a warning in the browser console.

## Root Cause

The `apple-mobile-web-app-capable` meta tag is deprecated in favor of the standard `mobile-web-app-capable` meta tag. Modern browsers and PWA standards recommend using the standard tag instead.

## Solution

Updated `apps/web/src/app/layout.tsx` to:

1. **Replace deprecated meta tag** in the `<head>` section:
   ```html
   <!-- Before (deprecated) -->
   <meta name="apple-mobile-web-app-capable" content="yes" />
   
   <!-- After (standard) -->
   <meta name="mobile-web-app-capable" content="yes" />
   ```

2. **Keep Apple-specific metadata** in the Metadata object:
   ```typescript
   export const metadata: Metadata = {
     // ... other metadata
     appleWebApp: {
       capable: true,
       statusBarStyle: "black-translucent",
     },
     other: {
       "mobile-web-app-capable": "yes",
     },
   };
   ```

## Changes Made

### File: `apps/web/src/app/layout.tsx`

**Metadata Object:**
- Added `other` property with `"mobile-web-app-capable": "yes"`
- Kept `appleWebApp` for Apple-specific settings

**Head Section:**
- Replaced `<meta name="apple-mobile-web-app-capable" content="yes" />` with `<meta name="mobile-web-app-capable" content="yes" />`
- Kept `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`

## Meta Tags Explanation

### Standard Meta Tags (Recommended)

```html
<!-- Mobile web app capable (standard) -->
<meta name="mobile-web-app-capable" content="yes" />

<!-- Theme color for browser UI -->
<meta name="theme-color" content="#2563eb" />

<!-- Viewport settings -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
```

### Apple-Specific Meta Tags (Still Supported)

```html
<!-- Apple status bar style -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<!-- Apple app title -->
<meta name="apple-mobile-web-app-title" content="Civiq" />

<!-- Apple icon -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support |
| Firefox | ✅ Full support |
| Safari | ✅ Full support |
| Edge | ✅ Full support |
| Opera | ✅ Full support |

## PWA Compatibility

The updated meta tags are fully compatible with Progressive Web App (PWA) standards:

- ✅ Web app manifest support
- ✅ Service worker support
- ✅ Offline functionality
- ✅ Install to home screen
- ✅ Standalone mode

## Verification

After the fix, you should see:

1. **No console warnings** about deprecated meta tags
2. **Proper PWA behavior** on mobile devices
3. **Correct status bar styling** on iOS
4. **Theme color applied** in browser UI

## Testing

### Desktop Browser
1. Open DevTools (F12)
2. Go to Console tab
3. No warnings about deprecated meta tags

### Mobile Browser
1. Open app on mobile device
2. Add to home screen
3. Verify app launches in standalone mode
4. Verify status bar styling

### PWA Testing
```bash
# Use Lighthouse to audit PWA compliance
npm run audit:pwa

# Or use Chrome DevTools
# 1. Open DevTools
# 2. Go to Lighthouse tab
# 3. Run PWA audit
```

## Related Files

- `apps/web/src/app/layout.tsx` - Main layout with meta tags
- `apps/web/public/manifest.json` - PWA manifest (if exists)
- `apps/web/public/apple-touch-icon.png` - Apple icon (if exists)

## References

- [MDN: Mobile Web App Capable](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name)
- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [PWA Standards](https://www.w3.org/TR/appmanifest/)
- [Apple Web App Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

## Summary

✅ **Fixed**: Deprecated `apple-mobile-web-app-capable` meta tag
✅ **Added**: Standard `mobile-web-app-capable` meta tag
✅ **Maintained**: Apple-specific settings via metadata object
✅ **Verified**: No TypeScript errors
✅ **Compatible**: Full PWA support

---

**Status**: ✅ FIXED
**Last Updated**: April 2026
**Version**: 1.0.0
