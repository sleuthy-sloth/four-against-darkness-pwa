# Deployment

## Target

**Platform**: Cloudflare Pages
**Domain**: 4ad.stevenkoehl.com
**Repository**: github.com/sleuthy-sloth/four-against-darkness-pwa

## Build Configuration

### Vite Base Path
```typescript
// vite.config.ts
export default defineConfig({
  base: '/', // Subdomain deployment
  // ...
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