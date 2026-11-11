# ADR-0001: Technology Stack Selection

## Status
Accepted

## Date
2026-11-10

## Context

We need to select a technology stack for the Four Against Darkness Digital PWA that supports:
- iPhone-first Progressive Web Application
- Offline-first operation (no backend required for gameplay)
- Complex game state management
- Deterministic random number generation
- Local persistence with IndexedDB
- SVG-based map rendering
- Mobile-optimized responsive UI

## Decision

We will use the following stack as specified in the project specification:

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Language | TypeScript | Type safety for complex game state |
| Frontend | React | Component model, ecosystem, PWA support |
| Build | Vite | Fast dev server, optimized production builds |
| Styling | Tailwind CSS | Utility-first, responsive, small bundle |
| Map Renderer | SVG | Scalable, interactive, no canvas complexity |
| State | Zustand | Lightweight, unopinionated, good TypeScript |
| Database | Dexie.js | Best IndexedDB wrapper, TypeScript support |
| Validation | Zod | Runtime validation matching TypeScript types |
| Testing | Vitest | Vite-native, fast, Jest-compatible API |
| E2E Testing | Playwright | Cross-browser, mobile emulation |
| PWA | vite-plugin-pwa | Vite integration, Workbox-based |
| Hosting | Cloudflare Pages | Free tier, custom domains, SPA support |
| CI/CD | GitHub Actions | Integrated with repository |

## Consequences

### Positive
- All technologies are mature, well-documented, and mutually compatible
- Strong TypeScript support across the stack
- Vite + React + Tailwind is a proven combination for PWAs
- Zustand is simpler than Redux for this use case
- Dexie.js handles IndexedDB complexity
- vite-plugin-pwa handles service worker complexity
- No vendor lock-in (all open source)

### Negative
- React adds bundle size (~40KB gzipped)
- Learning curve for team members unfamiliar with any piece
- Service worker debugging can be tricky

### Neutral
- Could have used Preact instead of React for smaller bundle
- Could have used plain IndexedDB instead of Dexie.js
- Could have used Pinia instead of Zustand

## Implementation Notes

- Use React 18+ with concurrent features
- Vite 5+ for best performance
- Tailwind 3.4+ with JIT compilation
- Configure Vite base path for subdomain deployment
- Generate PWA icons at all required sizes
- Use Workbox strategies: StaleWhileRevalidate for assets, NetworkFirst for API (if any)

## References
- Project Specification PART IV Section 6
- Project Specification PART VIII Section 28