# Deployment

## Current: GitHub Pages (temporary home)

Live at **https://sleuthy-sloth.github.io/four-against-darkness-pwa/**

- `.github/workflows/deploy.yml` builds (`npm ci` + `npm run build`) and
  deploys `dist/` to GitHub Pages on every push to `main` (and on manual
  dispatch). One-time setup: repo Settings → Pages → Build and deployment →
  Source: **GitHub Actions**.
- Because Pages serves a *project page* under the repo subpath, the Vite
  `base`, the PWA manifest `scope`/`start_url`, and the router `basename`
  are all `/four-against-darkness-pwa/` (see `vite.config.ts`,
  `src/main.tsx`). The workflow copies `dist/index.html` to `dist/404.html`
  so deep links (e.g. `/party`) serve the SPA instead of a 404.
- Verified locally before the first deploy: production build served at the
  subpath, root load + in-app navigation + a direct deep link all render
  under `/four-against-darkness-pwa/`, zero page errors, 228 tests green.

## Planned: Cloudflare Pages at 4ad.stevenkoehl.com

**Platform**: Cloudflare Pages
**Domain**: 4ad.stevenkoehl.com
**Repository**: github.com/sleuthy-sloth/four-against-darkness-pwa

Still needs a Cloudflare API token + account ID (as repo secrets
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`).

When it moves to the root domain, revert the subpath: `base`, manifest
`scope`/`start_url`, and router `basename` all go back to `/`, and the
`404.html` copy becomes unnecessary (Cloudflare Pages handles SPA
fallbacks natively).

## Build Configuration

### Vite Base Path
```typescript
// vite.config.ts
export default defineConfig({
  base: '/four-against-darkness-pwa/', // Project-page deployment (temporary)
  // ... (back to '/' for the root domain)
})
```

### Environment Variables
None required for build. All configuration via `vite.config.ts` and `wrangler.toml`.

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: four-against-darkness-pwa
          directory: dist
```

## Cloudflare Pages Setup

1. Connect GitHub repository
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add custom domain: `4ad.stevenkoehl.com`
5. Configure DNS (CNAME to pages.dev)

## Pre-Deployment Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] PWA manifest validated
- [ ] Service worker tested locally
- [ ] Offline functionality verified

## Post-Deployment Verification

1. Visit https://4ad.stevenkoehl.com
2. Test PWA installation (Add to Home Screen)
3. Launch installed PWA offline
4. Verify IndexedDB persistence
5. Test all 5 navigation tabs
6. Verify touch interactions work

## Rollback

Cloudflare Pages retains previous deployments. Rollback via dashboard or:
```bash
wrangler pages deployment rollback
```

## Updates

Service worker handles updates:
- Checks for new version on navigation
- Prompts user to refresh
- Caches new assets in background