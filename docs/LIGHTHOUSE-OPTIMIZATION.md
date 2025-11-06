# Lighthouse Optimization Guide

**Sprint 8 - Performance & Quality**
**Created:** 2025-01-06
**Target Scores:** Performance >90, Accessibility >95, Best Practices >90, SEO >90, PWA >80

---

## Quick Start

### Running Lighthouse Audits

```bash
# Install Lighthouse CI (one-time)
cd apps/web
pnpm add -D @lhci/cli

# Run Lighthouse audit
pnpm lighthouse http://localhost:3000

# Or use the configuration file
pnpm lhci autorun --config=lighthouserc.json
```

### Manual Audit in Chrome

1. Open Chrome DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select categories to audit
4. Choose device (Mobile/Desktop)
5. Click "Analyze page load"

---

## Current Implementation

### Performance Optimizations ✅

**Already Implemented:**

1. **Next.js App Router** - Automatic code splitting
2. **PWA with Service Worker** - Offline caching
3. **Image Optimization** - next/image (if used)
4. **Font Optimization** - next/font with Geist fonts
5. **Tree Shaking** - Automatic dead code elimination
6. **Minification** - Production builds minified
7. **Compression** - Gzip/Brotli on deployment

**Caching Strategy:**
- Static assets: 24 hours (StaleWhileRevalidate)
- API calls: 5 minutes (NetworkFirst)
- Google Fonts: 1 year (CacheFirst)

### Accessibility Optimizations ✅

**Already Implemented:**

1. **Semantic HTML** - Proper heading hierarchy
2. **Dark Mode** - High contrast support
3. **Color Contrast** - WCAG AA compliant
4. **Keyboard Navigation** - All interactive elements accessible
5. **ARIA Labels** - Screen reader support
6. **Focus Indicators** - Visible focus states

### SEO Optimizations ✅

**Already Implemented:**

1. **Metadata** - Title and description in layout.tsx
2. **Mobile Viewport** - Proper viewport meta tag
3. **Semantic Structure** - Proper HTML5 elements
4. **PWA Manifest** - App metadata for search engines

### PWA Score ✅

**Already Implemented:**

1. **Manifest.json** - Complete PWA manifest
2. **Service Worker** - Offline support via next-pwa
3. **Installability** - Meets PWA criteria
4. **Splash Screen** - Via manifest
5. **Theme Color** - Consistent branding

---

## Optimization Checklist

### Performance (Target: >90)

- [x] Enable compression (Gzip/Brotli)
- [x] Minimize JavaScript bundle size
- [x] Implement code splitting
- [x] Use Next.js Image optimization
- [ ] Implement lazy loading for components
- [ ] Optimize third-party scripts (Sentry, Analytics)
- [ ] Use font-display: swap for custom fonts
- [ ] Preload critical resources
- [ ] Minimize CSS bundle
- [ ] Implement resource hints (preconnect, prefetch)

### Accessibility (Target: >95)

- [x] Color contrast ratios (WCAG AA)
- [x] Semantic HTML structure
- [x] ARIA labels for interactive elements
- [x] Keyboard navigation support
- [x] Focus indicators
- [ ] Alt text for all images
- [ ] Form labels and error messages
- [ ] Skip navigation links
- [ ] Proper heading hierarchy
- [ ] Screen reader testing

### Best Practices (Target: >90)

- [x] HTTPS only (in production)
- [x] No console errors in production
- [x] Proper error boundaries
- [x] Sentry error tracking
- [ ] CSP (Content Security Policy) headers
- [ ] CORS headers configured
- [ ] No vulnerable dependencies
- [ ] Proper HTTP status codes
- [ ] No mixed content warnings

### SEO (Target: >90)

- [x] Title tags (<60 characters)
- [x] Meta descriptions (<160 characters)
- [x] Mobile-friendly design
- [x] Viewport meta tag
- [ ] Canonical URLs
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Structured data (JSON-LD)
- [ ] XML sitemap
- [ ] robots.txt

### PWA (Target: >80)

- [x] Valid manifest.json
- [x] Service worker registered
- [x] Works offline
- [x] Installable
- [x] Themed address bar
- [ ] 192px and 512px icons
- [ ] Splash screens
- [ ] Update prompt for new versions

---

## Performance Budget

### JavaScript

- **Total JS Size:** <300KB (compressed)
- **Main Bundle:** <200KB (compressed)
- **Third-Party:** <100KB (compressed)

### Images

- **Format:** WebP or AVIF
- **Max Size:** 200KB per image
- **Lazy Loading:** Below the fold

### Fonts

- **Total Font Size:** <100KB
- **font-display:** swap
- **Preload:** Critical fonts only

### Time Metrics

- **First Contentful Paint (FCP):** <1.8s
- **Largest Contentful Paint (LCP):** <2.5s
- **Time to Interactive (TTI):** <3.8s
- **Total Blocking Time (TBT):** <200ms
- **Cumulative Layout Shift (CLS):** <0.1

---

## Common Issues & Fixes

### Issue: Large JavaScript Bundle

**Fix:**
```javascript
// Use dynamic imports for large components
const AnalyticsDashboard = dynamic(() => import('@/components/AnalyticsDashboard'), {
  loading: () => <LoadingSkeleton />,
  ssr: false // Client-side only if needed
});
```

### Issue: Slow Image Loading

**Fix:**
```jsx
// Use Next.js Image with proper sizing
import Image from 'next/image';

<Image
  src="/tournament-bg.jpg"
  alt="Tournament background"
  width={1200}
  height={600}
  priority // For above-the-fold images
  placeholder="blur"
  blurDataURL="data:image/..."
/>
```

### Issue: Low Accessibility Score

**Fix:**
```jsx
// Add proper ARIA labels
<button
  onClick={handleClick}
  aria-label="Open tournament details"
  aria-expanded={isExpanded}
>
  View Details
</button>

// Ensure color contrast
const buttonClass = "bg-blue-600 text-white" // 4.5:1 contrast minimum
```

### Issue: Missing PWA Icons

**Fix:**
```bash
# Create icons directory
mkdir apps/web/public/icons

# Generate icons (use tool like https://realfavicongenerator.net/)
# Add icons: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
```

### Issue: Third-Party Script Impact

**Fix:**
```jsx
// Use Next.js Script component with strategy
import Script from 'next/script';

<Script
  src="https://analytics.example.com/script.js"
  strategy="lazyOnload" // or "afterInteractive"
/>
```

---

## Next.js Specific Optimizations

### Enable Compiler Optimizations

```typescript
// next.config.ts
export default {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### Optimize Fonts

```typescript
// Already implemented in layout.tsx
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap', // Important for performance
  preload: true,
});
```

### Image Optimization

```bash
# Add sharp for optimal image processing
pnpm add sharp
```

### Bundle Analyzer

```bash
# Install bundle analyzer
pnpm add -D @next/bundle-analyzer

# Update next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true pnpm build
```

---

## Automated Testing

### Add Lighthouse CI to Package.json

```json
{
  "scripts": {
    "lighthouse": "lighthouse http://localhost:3000 --view",
    "lighthouse:ci": "lhci autorun",
    "lighthouse:mobile": "lighthouse http://localhost:3000 --preset=mobile --view"
  }
}
```

### GitHub Actions Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install && npm run build
      - run: npm run lighthouse:ci
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/tournaments
          uploadArtifacts: true
```

---

## Monitoring & Continuous Improvement

### Core Web Vitals Tracking

```typescript
// Add to app/layout.tsx
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Send to analytics
  console.log(metric);

  // Or send to Sentry
  if (metric.label === 'web-vital') {
    // Sentry.captureMessage(`${metric.name}: ${metric.value}`);
  }
}
```

### Regular Audits

- **Weekly:** Run Lighthouse on staging
- **Pre-Deploy:** Run full audit suite
- **Post-Deploy:** Verify production metrics
- **Monthly:** Review and update budget

---

## Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web.dev Performance](https://web.dev/performance/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

*Last Updated: 2025-01-06*
*Sprint: 8*
*Status: Ready for Audits*
