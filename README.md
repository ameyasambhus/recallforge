# RecallForge

## Project Overview
RecallForge is a **full-stack React + Node + PostgreSQL application** designed to help students study smarter using **Active Recall** and **Spaced Repetition**.
Users create cards for topics they learn, and the app schedules intelligent reviews to maximize memory retention and learning efficiency.

---

## Features
- Full-stack app: **React, Node/Express, PostgreSQL (Neon)**
- JWT authentication with **OTP email verification**, password reset
- **SM-2 spaced repetition** with user-tunable scheduling settings
- **AI-powered answer generation** (Gemini) with server-sent streaming and usage limits by plan
- **Card attachments** (images/PDFs), OCR extraction, and Cloudinary moderation webhooks
- **Semantic search** across cards and duplicate detection
- **Folders and lists** with list sharing and permission management
- **Subscriptions and billing** (Razorpay) with plan-based limits
- Responsive UI for **quick, focused learning**

---

## How RecallForge Works

1. **Create a Card:** Enter a **question and answer** for each topic you learn.
  - **AI-Assisted Learning:** Draft a question and let the **Gemini API** stream back a suggested answer.
  - **Media Attachments:** Add images or PDFs; OCR extracts text for faster review.
2. **Organize by Subject:** Group cards into **folders** and curated **lists** (shareable with permissions).
3. **Intelligent Scheduling:** Each card is assigned a review schedule using the **SM-2 algorithm** with configurable user settings.
4. **Daily Reviews:** Visit the **Review Section** to see cards due for review. Attempt to recall each answer.
5. **Feedback & Adaptation:** Rate recall (0–5). The system updates the next review interval for maximum retention.

---

## SM-2 Algorithm (Conceptual)

- Each card tracks **how well you remember** it and **when it was last reviewed**.  
- After reviewing, you rate your recall on a **0–5 scale**.  
- The algorithm uses this feedback to **adjust the next review interval intelligently**:
  - Cards you remember easily appear **less frequently**.  
  - Cards you struggle with appear **sooner**.  
- This ensures you **review each card just before forgetting**, maximizing retention and study efficiency.

---

## Why Spaced Repetition Works

- **Fights the Forgetting Curve:** Reinforces memory at optimal intervals  
- **Efficient Learning:** Focus on material you struggle with; skip what you already know  
- **Active Recall:** During reviews, you attempt to **recall the answer from memory** rather than just rereading it.  
  - This process **strengthens memory traces** and embeds knowledge deeper into long-term memory.
---

## Implementation Details

**Backend:**
- PostgreSQL stores cards, folders, lists, media metadata, subscriptions, and user settings
- RESTful APIs for cards, lists, media, billing, and account management
- OCR pipeline for attachments and Cloudinary moderation webhooks

**Frontend:**
- React + Vite for a responsive, fast UI
- Review flow, card management, folders, and shared lists

**Authentication & Security:**
- JWT-based authentication
- Email verification and password reset using OTP
- Rate limiting using Redis

---

## Tech Stack
- **Frontend:** React, Vite, Tailwind, DaisyUI
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL (Neon)
- **Auth & Security:** JWT, OTP via Nodemailer, rate limiting
- **AI Integration:** Gemini API for answer generation
- **Media:** Cloudinary, Tesseract OCR, Poppler utils (pdftoppm), Sharp
- **Payments:** Razorpay
