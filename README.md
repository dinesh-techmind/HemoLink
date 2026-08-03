# 🩸 Emergency Blood Donor Finder
> "Every Second Counts. Find a compatible donor near-by instantly during medical crises."

Emergency Blood Donor Finder is a modern, high-contrast, fully responsive React full-stack application built for maximum speed and absolute visual clarity. It empowers patients, nurses, and crisis coordinators to locate, filter, map, and secure-chat with compatible blood donors nearby in moments of emergency.

---

## 🎨 Design Theme & Core Objectives
* **Aesthetic**: Slate-black dark theme ("Medical Emergency meets Modern Fintech") optimized for extreme legibility in dim-lit hospital wards.
* **Geographical Proximity**: Utilizes great-circle Haversine formula calculation to rank and displaynearest compatible donors inside interactive Leaflet map layers.
* **Security & ABAC Control**: Hidden contact phone numbers. The system reveals phone coordinates ONLY after a registered donor accepts an active seeker's connection alert.
* **Sandbox Simulators**: Floating multi-persona sandboxes allowing a reviewer to toggle roles between patient seekers (Dr. Sandeep), registered donors (Priya Sharma), and दिनेश (Super Admin) to test instant chat streams from a single browser page.

---

## 📁 Key File Map
* `/server.ts` — Full-stack Express.js server that serves client assets and hosts the Gemini API secure chat-bot proxy.
* `/src/App.tsx` — Front-end layout, forms, interactive map controller, and dashboard panel interfaces.
* `/src/lib/store.ts` — Unified secure persistence store containing seed data backups and reactive subscription patterns.
* `/src/types.ts` — Strongly validated TypeScript structures.
* `/firestore.rules` — Rigorous Zero-Trust safety rules guarding collections.

---

## 🚀 Setup & Launch Instructions

### 1. Configure Secrets in Google AI Studio
1. Open the **Secrets Panel** (Settings) in the Google AI Studio UI.
2. Declare your `GEMINI_API_KEY` to enable contextual simulated conversational replies.

### 2. Launch Local Environment
```bash
# Install package dependencies
npm install

# Start full-stack local server (Port 3000)
npm run dev
```

### 3. Build & Bundling
```bash
# Compile client assets & bundle Node.js Express server to standalone dist/server.cjs
npm run build

# Standalone execution
npm run start
```
