# App Redesign - Treasury-6 as Primary Experience

**Date:** 2026-01-10
**Status:** Approved

## Overview

Replace the main app with the treasury-6 design as the primary navigation experience. Update authentication pages with new styling and implement a tiered onboarding system for new users.

## Route Structure

### New Routes

```
/login              → Updated login page (treasury-6 styling)
/sign-up            → New multi-step sign up flow
/onboarding         → Onboarding section (Tier 1 steps)
/                   → Redirects to /overview
/overview           → Main dashboard (was /treasury-6)
/vaults             → Vaults list
/vaults/$vaultId    → Vault detail + nested routes
/identities         → Identities management
/address-book       → Address book
/settings           → Settings
```

### Routes to Remove

- `/app/*` - Old app routes
- `/manager/*` - Manager section
- `/treasury/*` through `/treasury-5/*` - Demo iterations

### Auth Flow

1. Unauthenticated users → `/login` or `/sign-up`
2. After sign-up completion → `/onboarding`
3. After login (existing users) → Check onboarding status → `/overview` or resume `/onboarding`

---

## Login Page Design

### Layout

- Split 50/50 layout (or 45/55 favoring the form side)
- Left side: Login form
- Right side: Abstract geometric pattern in brand colors

### Left Side (Form)

- io.finnet logo at top
- "Welcome back" heading
- Email input field
- Password input field
- "Sign in" button (sharp corners, brand-500 background)
- "Forgot password?" link
- Divider with "or"
- Social login option (GitHub)
- "Don't have an account? Sign up" link at bottom

### Right Side (Branding)

- Full-height panel with brand color background (brand-500 or darker)
- Abstract geometric pattern: clean lines, grid elements, or sharp angular shapes
- Subtle depth through layered shapes or gradients
- No mascot, purely geometric/minimal

### Styling (Treasury-6 Aesthetic)

- Sharp corners throughout (no rounded corners)
- Clean sans-serif typography
- Minimal color palette: neutrals + brand accent
- Subtle borders, no heavy shadows
- Input fields: light background (neutral-50), thin border

---

## Sign Up Flow

### Single Page, Multi-Step Design

**Step Indicator:**
- Horizontal progress bar at top of form area
- 3 segments: "Create Account" → "Verify Email" → "Organization"
- Current step highlighted, completed steps show checkmark

### Step 1 - Create Account

- Heading: "Create your account"
- Email input field
- Password input field (with strength indicator)
- Confirm password input field
- "Continue" button
- "Already have an account? Sign in" link

### Step 2 - Verify Email

- Heading: "Verify your email"
- Subtext: "We sent a 6-digit code to {email}"
- 6 individual digit inputs (auto-advance on entry)
- "Resend code" link with cooldown timer
- "Back" and "Verify" buttons

### Step 3 - Organization

- Heading: "Create your organization"
- Organization name input field
- Optional: Organization description/type
- "Complete Setup" button

### Transitions

- Smooth fade/slide between steps
- Form content swaps, layout stays consistent
- Right panel (geometric pattern) remains static throughout

---

## Onboarding System

### Tier Structure

**Tier 1 - Initial Setup:**
- Overview/Welcome
- Register a signer (skippable, API-checked)
- Create vault (requires signer)

**Tier 2 - Team:**
- Invite members
- Conduct a re-share

**Tier 3 - Security:**
- Backup and security setup

**Tier 4 - Organization:**
- Set up identities
- Configure address book

**Tier 5 - Operations:**
- Receive first assets
- Send a transaction

### Onboarding Page (`/onboarding`)

For Tier 1, a dedicated full-page experience:

**Step 1 - Overview/Welcome:**
- Welcome message with user's name/organization
- Brief explanation of what io.vault does
- Visual preview or illustration of the product
- "Get Started" button to proceed

**Step 2 - Register Signer:**
- Explanation of what a signer is and why it's needed
- Instructions to register via mobile app or hardware
- API polling to detect when signer is registered
- "Skip for now" option (clearly indicates vault creation will be unavailable)
- "Continue" button (enabled when signer detected or skipped)

**Step 3 - Create Vault:**
- Only accessible if signer is registered
- If skipped signer: shows message explaining requirement, link back
- If signer registered: vault creation form (name, governance settings)
- On completion: redirect to new vault's detail page

**Completion Logic:**
- All steps done → redirect to vault detail page
- Any step skipped/incomplete → redirect to `/overview` with checklist panel

### Onboarding Checklist Panel

Displayed on the overview page for incomplete onboarding.

**Placement:**
- Prominent section on overview page
- Collapsible accordion showing all 5 tiers

**Accordion Structure:**

```
▼ Tier 1: Initial Setup          [2/3 complete]
   ✓ Welcome overview
   ✓ Register a signer
   ○ Create your first vault     [→ Button]

▶ Tier 2: Team                   [Locked until Tier 1 complete]
   ○ Invite team members
   ○ Conduct a re-share

▶ Tier 3: Security               [Locked]
   ○ Backup and security setup

▶ Tier 4: Organization           [Locked]
   ○ Set up identities
   ○ Configure address book

▶ Tier 5: Operations             [Locked]
   ○ Receive your first assets
   ○ Send a transaction
```

**Behavior:**
- Current tier expanded by default, others collapsed
- Completed tiers show checkmark, can expand to review
- Locked tiers show lock icon, greyed out until previous tier complete
- Each incomplete step has action button to jump to that task
- Optional "Dismiss" once all tiers complete

**Visual Style:**
- Card with sharp corners, subtle border
- Progress percentage or fraction per tier
- Brand accent color for active/current items
- Neutral colors for locked/future items

---

## Implementation Plan

### Files to Create

- `src/features/auth/page-sign-up.tsx` - Multi-step sign up flow
- `src/features/onboarding/page-onboarding.tsx` - Tier 1 onboarding page
- `src/features/onboarding/components/` - Onboarding step components
- `src/components/onboarding-checklist.tsx` - Accordion checklist component
- New route files at root level for all main pages

### Files to Modify

- `src/features/auth/layout-login.tsx` - New treasury-6 styling
- `src/features/auth/page-login.tsx` - Treasury-6 design update
- Auth redirect logic - Point to new routes
- `src/layout/treasury-6/` - Becomes main layout (possibly renamed)

### Files to Remove

- `/src/routes/app/` - Old app routes
- `/src/routes/manager/` - Manager section
- `/src/routes/treasury/` through `/src/routes/treasury-5/` - Demo iterations

---

## Design Decisions

1. **Split layout for auth pages** - Maintains familiar pattern, allows branded visual on right
2. **Abstract geometric patterns** - Fits treasury-6 minimal aesthetic, no mascot
3. **Clerk-style sign up** - Proven UX pattern, step-by-step reduces cognitive load
4. **Tiered onboarding** - Progressive disclosure, doesn't overwhelm new users
5. **Collapsible accordion** - Shows progress without cluttering the overview
