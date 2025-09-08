# RecallForge

## Project Overview
RecallForge is a **full-stack MERN application** designed to help students study smarter using **Active Recall** and **Spaced Repetition**.  
Users create cards for topics they learn, and the app schedules intelligent reviews to maximize memory retention and learning efficiency.

---

## Features
- Full-stack MERN app: **MongoDB, Express, React, Node**
- JWT authentication with **OTP email verification** and password reset via **Nodemailer**
- **SM-2 spaced repetition algorithm** for personalized study schedules
- Responsive UI for **quick, focused learning**

---

## How RecallForge Works

1. **Create a Card:** Enter a **question and answer** for each topic you learn. Each card represents knowledge you want to retain.
2. **Organize by Subject:** Group cards into **folders based on subjects**. This allows you to filter and focus reviews on specific subjects or topics  
3. **Intelligent Scheduling:** Each card is automatically assigned a review schedule using the **SM-2 algorithm**.  
4. **Daily Reviews:** Visit the **Review Section** to see cards due for review. Attempt to recall each answer.  
5. **Feedback & Adaptation:** Rate how well you remembered each card (0–5). The system updates the next review interval for maximum retention.

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
- MongoDB stores cards with question, answer, EF, interval, repetition, next review date  
- RESTful APIs for creating cards, fetching due reviews, updating feedback  

**Frontend:**
- React.js for responsive, intuitive UI  
- Review tab to revise all due cards one by one
- Cards tab displays all cards and allows to filter by subjects

**Authentication & Security:**
- JWT-based authentication  
- Email verification and password reset using OTP verification

---

## Tech Stack
- **Frontend:** React.js  
- **Backend:** Node.js, Express.js  
- **Database:** MongoDB  
- **Authentication:** JWT, OTP verification via Nodemailer
