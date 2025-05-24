# 🧱 App Architecture: Freelancer Contract Platform

## Overview

This app helps freelancers manage contracts, clients, signatures, and payments. Built with:

- **Next.js App Router**
- **Firebase Auth + Firestore**
- **Stripe for payments**
- **Tailwind CSS** for styling

---

## 🔧 Tech Stack

| Layer               | Tool                 |
| ------------------- | -------------------- |
| Frontend            | Next.js (App Router) |
| Styling             | Tailwind CSS         |
| Auth                | Firebase Auth        |
| Database            | Firestore            |
| Payments            | Stripe               |
| Hosting             | Vercel (assumed)     |
| Realtime (optional) | EditorJS             |

---

## 📁 Folder Structure

### Root

- `.env*`, `firebase.json`, `firestore.rules`: Firebase config
- `README.md`: Main project info
- `server.js`: Dev/proxy setup if needed
- `scripts/`: Dev/setup scripts
- `stripe-config-*`: Stripe-related setup guides

---

### `src/`

#### 📁 `app/`

Next.js App Router directory (file-based routing)

- `dashboard/`: Authenticated dashboard layout (user's main workspace)
- `public/`: Landing pages, auth, marketing
- `api/`: Custom Next.js API routes
- `auth-debug.tsx`: Test/debug auth state
- `Components/`: Page-specific components (consider moving shared ones to `components/` root)
- `tests/`, `test-stripe/`: QA or sandbox environments

#### ⛑️ Entry Components

- `layout.tsx`: Global app layout
- `ClientWrapper.tsx`: Likely Firebase/Context provider wrapper
- `error.tsx`, `global-error.tsx`: Custom error handling
- `not-found.tsx`: 404 page

---

### `components/`

Global reusable UI components (buttons, modals, inputs, etc.)

### `lib/`

Utility functions, helpers (e.g., Firebase, API logic, date utils)

### `types/`

TypeScript types & interfaces

### `utils/`

Low-level helpers not tied to business logic

---

## 🔐 Auth Flow

- Firebase Auth with email/password or OAuth (e.g., Google)
- Auth state likely wrapped via `ClientWrapper.tsx`
- Guards or redirects in `middleware.ts`

---

## 💳 Payments

- Stripe integrated via `test-stripe/`, `stripe-config-*` files
- Billing likely triggered via dashboard actions
- Webhooks possibly handled in `api/`

---

## 🧪 Testing / Debug

- `auth-debug.tsx`: Visual auth state inspector
- `test-stripe/`: Payment sandbox area
- `tests/`: Possible testing routes/components

---
