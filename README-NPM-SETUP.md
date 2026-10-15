# Habita v41 — AI planning feature

This version builds on v40's Vite/npm setup and Firebase AI Logic helper. It adds an optional **Get AI planning advice** action to step 2 of the multi-goal planner. The request only uses the goals and schedule details the user entered in that planner. The regular rule-based plan remains available if AI fails.

## Vercel setup

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` = the **site key** for the reCAPTCHA Enterprise key you registered with Firebase App Check. This is a public site key, not a secret. Set it for Production (and Preview if you test there), then redeploy.

## Firebase setup

- Firebase AI Logic should be configured with the Gemini Developer API provider.
- App Check should be registered for the Habita Web app and configured to use the matching reCAPTCHA Enterprise site key.
- Do not enable production enforcement until the deployed app can successfully obtain App Check tokens and make a test AI request; if the guided setup already enforced AI Logic, use the production provider configuration rather than disabling protection.
- AI model availability and free-tier quotas vary. If the request fails, Habita's regular planner still works.

## Test

1. Confirm the environment variable is set in Vercel and redeploy.
2. Open the deployed app and open the multi-goal planner.
3. Enter one or more goals and a weekly hour amount, then continue.
4. On “About your day”, tap **Get AI planning advice**.
5. Confirm a response appears. If it fails, use the exact error shown to troubleshoot.
6. Tap **Build my plan** to confirm the regular planner still works.

## Privacy note

The AI prompt includes the goals, deadline, available hours, schedule, energy selection and obstacle text entered into this planner. Do not submit information you don't want sent to the AI provider.
