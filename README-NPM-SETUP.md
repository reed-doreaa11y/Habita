# Habita v39 — npm/Vite foundation

This version moves Firebase imports from CDN dynamic imports into a standard npm-managed Vite project. It preserves the existing single-page UI and PWA assets while making Firebase AI Logic available through `window.habitaAI.ask(prompt)`.

## Local development

1. Install Node.js 20.19+ or 22.12+.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` before deploying.

## Vercel deployment

Import/push this project to GitHub. In Vercel, set Build Command to `npm run build` and Output Directory to `dist`. Framework preset can be Vite.

## Firebase AI Logic status

- SDK package is included via the `firebase` npm dependency.
- `window.habitaAI.ask(prompt)` is a minimal lazy AI helper using the Gemini Developer API backend and `gemini-2.5-flash`.
- This is not yet wired to a visible planner/reflection control.
- Complete App Check configuration in Firebase Console before production use. Do not add a localhost debug token to production.
- Model availability/free quota can vary by project/region and provider policy. If AI fails, the existing planner remains available.

## Notes

- Firebase web config is client configuration, not a secret; security must be enforced with Firebase Security Rules and App Check.
- Existing service worker and manifest are retained. Verify PWA install/update behaviour after deployment because the app is now built into `dist`.
