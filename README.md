# 🛡️ CyberAware — Cybersecurity Awareness Training Platform

A production-ready educational web application that teaches users about **phishing attacks** and **malware threats** through interactive quizzes, personalized feedback, and gamification.

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vanilla CSS, Vite, Recharts, React Router |
| **Backend** | Python, Django 4.2, Django REST Framework |
| **Auth** | JWT (SimpleJWT) — Access + Refresh tokens & Email OTP |
| **Database** | SQLite (dev) / PostgreSQL (prod) |

## 📁 Project Structure

`
Cyber_Security_AP/
├── backend/                # Django REST API
│   ├── accounts/           # Auth, user management & OTP verification
│   ├── quiz/               # Quiz engine, questions, scoring, news & gamification
│   ├── leaderboard/        # Rankings & badges
│   ├── seed/               # Seed data (372 questions)
│   └── core/               # Django settings
├── frontend/               # React SPA
│   └── src/
│       ├── pages/          # Onboarding, survey, quiz & results pages
│       ├── components/     # Reusable layout & common components (e.g. CenterModal)
│       ├── context/        # Auth & theme state management
│       └── api/            # Axios instance
└── README.md
`

## ⚡ Quick Start

### Backend Setup

`ash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_questions
python manage.py runserver
`

### Frontend Setup

`ash
cd frontend
npm install
npm run dev
`

### Default Admin Login
- **Email:** dmin@cyberaware.com
- **Password:** Admin@123

---

## 🎯 Key Enhanced Features

- ✅ **Secure Password Storage:** Built with industry-standard Django security defaults (PBKDF2/SHA-256).
- ✅ **Email Verification via OTP:** Multi-step smart signup validates email format, checks for duplicates, sends a 6-digit OTP code, and requires verification before registration succeeds.
- ✅ **Randomized Surveys:** Onboarding surveys draw 5 unique questions from an expanded 11-question pool, ensuring unique surveys for different users.
- ✅ **Interactive Quiz Overhaul:** Beautiful CSS styling with hover sweep highlights, glowing selected states, progress trackers, and detailed feedback.
- ✅ **Keyboard Navigation:** Support for selecting choices using keys A, B, C, D and switching questions with Arrow Keys.
- ✅ **Adaptive Quiz Engine:** Delivers 5, 8, or 12 personalized questions based on user survey categories for 20, 30, and 50 question modes respectively, filling the rest with random questions.
- ✅ **Centered Dialogs:** Unified modal design that portal-renders onto document.body for consistent center-screen positioning.
- ✅ **Verified Learning Resources:** Curated working links for learning recommendations and global news updates from active security agencies (CISA, MeitY, NCSC, and YouTube).

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/smart/ | No | Step 1 Auth: Email & password validation |
| POST | /api/auth/send-otp/ | No | Dispatch registration OTP |
| POST | /api/auth/verify-otp/ | No | Verify registration OTP |
| POST | /api/register/ | No | Create user profile after verification |
| POST | /api/login/ | No | Login (JWT Access + Refresh) |
| POST | /api/token/refresh/ | No | Refresh JWT token |
| GET/PUT | /api/profile/ | Yes | Profile info & progress stats |
| POST | /api/change-password/ | Yes | Change password |
| POST | /api/forgot-password/ | No | Forgot password |
| POST | /api/reset-password/ | No | Reset password |
| GET | /api/quiz/start/ | Yes | Start personalized quiz |
| POST | /api/quiz/submit/ | Yes | Submit quiz |
| GET | /api/quiz/history/ | Yes | Quiz history list |
| GET | /api/quiz/review/:id/ | Yes | Detailed answers review |
| GET | /api/leaderboard/ | Yes | Global leaderboard rankings |
| GET | /api/admin/stats/ | Admin | Analytics |
| GET | /api/admin/users/ | Admin | User list |

## 📄 License

Built for educational purposes — MCA PBL Project.
