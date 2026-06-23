# Rentidge — session instructions for Claude

## Behaviors

**Session-end to-do recap.** When the user signals they want to end / pause the session — phrases like "let's pause," "wrap up," "ending session," "stopping for now," "that's enough for today," or similar — automatically output the current pending to-do list as the final message. Pull from:

1. The most recent to-do list saved below in this file, AND
2. Any new pending work that came up during the current session

Format it as a single markdown list grouped by section (current work / future / blocked). Do not ask for confirmation — just output it. If nothing meaningful is pending, output a short "Nothing pending — clean state" instead of a fake list.

## Current pending to-do list

Last updated: 2026-06-23

### E-signature integration — picking back up later

**Branch:** `claude/lease-documents-pr-b` (deployed to prod at www.rentidge.com)

**To finish the test:**
1. Paste webhook URL into SignWell → Rentidge.Dev app → Event Callback URL → `https://www.rentidge.com/api/sign-webhook/66995262-46e1-41d6-a1dd-9c5e017ec3ec`
2. Add `SIGNWELL_TEST_MODE=true` to Vercel (Production + Preview + Development) → wait for redeploy
3. Delete old `SIGNWELL_API_KEY` and `SIGNWELL_API_APP_ID` Vercel env vars
4. End-to-end test sign (~3-4 of 25 monthly API calls):
   - Documents tab → upload sample PDF
   - "Setup merge fields" → drag fields in iframe → save
   - Assign to a test tenant
   - Log in as tenant in portal → sign in iframe
   - Verify status flips to "Signed" + PDF lands in `signed-leases` bucket

**After test passes:**
5. Remove `SIGNWELL_TEST_MODE` (or set to false) for real legal signatures
6. Rotate SignWell API key — original was screenshotted earlier
7. Upgrade SignWell to $8/mo Standard for unlimited signatures

**Future / on-demand:**
8. Add DocuSign as a second provider — only when a landlord requests it. ~1-2 days via existing `lib/esign/` abstraction layer.
9. Legal language for ToS — "Rentidge as platform, landlord as signing party"
10. Landlord onboarding docs for SignWell connection

### UI polish — make dashboards feel professional, not AI-generated

**Goal:** landlord and tenant dashboards should feel like a hand-crafted product, not a Cursor/Lovable-style template.

**Common AI-vibe tells to hunt for:**
- Card explosion — everything in equal-weight rounded cards instead of real visual hierarchy
- Default colors — generic gray-on-dark, primary-blue everything
- Stat box overuse — the "Collected / Pending / Open / Units" row is a classic AI pattern
- Inline-style sprawl (`style={{...}}`) instead of a design system
- No empty-state design — "No rows" defaults
- Form fields with browser defaults

**Concrete approaches when revisiting:**
- Reference Stripe Dashboard, Linear, or Mercury for visual language
- Strip stat boxes from above-the-fold; replace with one or two meaningful numbers
- Tighter typography scale (2-3 sizes max)
- Real loading skeletons instead of "Loading…" text
- Consider Tailwind UI / Catalyst component license (~$300) as a foundation, OR hire a designer for ~$1-2K, OR surgical 2-3 session redesigns with Claude

## Notes for future Claude

- Working directory is `/home/user/NestPay/NestPay` (NOT the outer `/home/user/NestPay`). The outer is just a git wrapper.
- E-sign provider model is BYO per-landlord (not shared). Credentials live on `profiles.signwell_api_key` and `profiles.signwell_api_app_id`. See `lib/esign/index.ts` → `esignForLandlord(id)`.
- Migration 0006 (esign metadata) and 0007 (per-landlord signwell creds) have been run on Supabase.
- Rentidge brand: dark theme, accent color around `#38BDF8` sky-blue.
