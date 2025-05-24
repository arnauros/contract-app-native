# 🛠 tasks.md – MVP Build Plan

## ✅ Core Setup

1. [x] Initialize Next.js App Router with `src/app`
2. [x] Set up Tailwind CSS
3. [x] Integrate Firebase (Auth + Firestore)
4. [x] Add Stripe test environment
5. [x] Create `ClientWrapper.tsx` for context providers (auth, theming, etc.)

---

## 🔐 Authentication

6. [x] Build login/signup screens with Firebase Auth
7. [x] Add auth state management in layout or client wrapper
8. [x] Create middleware to protect `dashboard/` routes
9. [x] Add logout and auth debug tools

---

## 📄 Contract Management

10. [x] Create "New Contract" form
11. [x] Store contract data in Firestore
12. [x] Generate a preview before submitting
13. [x] Add ability to update/delete contracts
14. [x] Create contract detail view page

---

## ✍️ Signatures & Client Interaction

15. [x] Enable client link-sharing (view-only or signable)
16. [x] Add "Sign Contract" button with confirmation
17. [x] Store signature metadata in Firestore
18. [x] Add real-time comments (optional via editorjs)

---

## 💳 Payments Integration

19. [x] Set up Stripe API keys and test keys
20. [x] Create checkout session trigger from contract
21. [x] Handle Stripe webhooks (via `api/`)
22. [x] Display payment status in contract UI

---

## 🖼 UI & UX Polish

23. [ ] Ensure mobile responsiveness across views
24. [ ] Add loading skeletons or spinners for contract actions
25. [ ] Audit `public/` and remove unused routes or styles
26. [ ] Ensure proper 404 and error pages work

---

## 🧪 QA & Deployment

28. [ ] Test full user journey: login → create → sign → pay
29. [ ] Test client view links with no login
30. [ ] Test Stripe payments and webhook flow
31. [ ] Verify Firestore rules block unauthorized access
32. [ ] Prepare `.env` for production deploy
33. [ ] Deploy to Vercel (or Firebase Hosting)

---

## 📦 Optional Extras

34. [ ] Add AI-powered contract generator (OpenAI, custom prompt)
35. [ ] Add billing history page
36. [ ] Add team collaboration or shared dashboards
