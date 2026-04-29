# 🎓 Adaptive Learning Recommendation System

A production-ready, full-stack **Adaptive Learning Recommendation System** that personalizes educational content for students using a hybrid ML recommendation engine powered by **LightFM**.

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React +   │────▶│  FastAPI     │────▶│ PostgreSQL  │
│   Vite      │     │  REST API   │     │  (Data)     │
│  :5173      │     │  :8000      │     │  :5432      │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐     ┌─────────────┐
                    │   Celery    │────▶│   Redis     │
                    │   Worker    │     │  (Broker)   │
                    └─────────────┘     │  :6379      │
                                        └─────────────┘
```

## ✨ Features

- **Hybrid ML Recommendations** — LightFM with WARP loss for personalized course suggestions
- **Popularity Fallback** — Trending content when no trained model is available
- **Async Training** — Celery background tasks for model retraining
- **JWT Authentication** — Secure token-based auth with role-based access control
- **Admin Dashboard** — Content management and model training triggers
- **Beautiful Dark UI** — Modern React frontend with glassmorphism and micro-animations
- **Auto-seeding** — Database populates with sample data on first startup

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose

### Start the System

```bash
cd AdaptiveLearningSystem
docker-compose up --build
```

### Access

| Service       | URL                          |
|---------------|------------------------------|
| Frontend      | http://localhost:5173         |
| API Docs      | http://localhost:8000/docs    |
| Health Check  | http://localhost:8000/health  |

### Demo Credentials

| Role    | Email                | Password    |
|---------|----------------------|-------------|
| Admin   | admin@example.com    | admin123    |
| Student | student@example.com  | student123  |

Demo login buttons bypass OTP only while `DEMO_AUTH_BYPASS_ENABLED=true`, so demos keep working even before SMTP is configured. Real signups and real logins still require email OTP.

### Email OTP Configuration

Email sender settings are configured inside the app, not in `.env`.

1. Start the app.
2. Click `Admin demo` on the login page.
3. Open the user menu, then `Settings`.
4. Enter the SMTP sender details and save. The app sends a test email immediately.
5. For production, set `DEMO_AUTH_BYPASS_ENABLED=false`, change `SECRET_KEY`, and restart the containers.

For Gmail, use a Google App Password instead of your normal account password. Registration sends an email verification OTP. Login verifies the password first, then sends a login OTP and issues the JWT only after the OTP is verified. OTPs are stored as bcrypt hashes and expire after 10 minutes.

Demo controls are intentionally separate:
- `Student demo` / `Admin demo` login use seeded demo accounts and skip OTP only for allowlisted emails in `DEMO_LOGIN_EMAILS`.
- `Continue as demo learner` on signup creates a temporary verified demo learner with a `@demo.local` address.
- Turn `DEMO_AUTH_BYPASS_ENABLED` off before using real users.

## Public Deployment

Vercel can host the React/Vite frontend. This app's backend also needs a public FastAPI service plus PostgreSQL and Redis, so do not deploy only the frontend or users will see the site but login, signup, OTP, recommendations, and settings will fail.

Recommended setup:

1. Deploy the backend Docker app to a backend host such as Render, Railway, Fly.io, or a VPS.
2. Attach managed PostgreSQL and Redis to that backend.
3. Set backend environment variables:
   - `DATABASE_URL`
   - `SYNC_DATABASE_URL`
   - `REDIS_URL`
   - `SECRET_KEY`
   - `DEMO_AUTH_BYPASS_ENABLED=false`
4. Open the backend URL and confirm `/health` works.
5. Deploy `frontend/` to Vercel.
6. In Vercel project settings, add:
   - `VITE_API_BASE_URL=https://your-backend-url`
7. Redeploy the frontend after adding the environment variable.
8. Open the Vercel link, sign in as admin, configure the email sender, and send the test email.

When deploying from GitHub to Vercel, set the Vercel Root Directory to `frontend`, Build Command to `npm run build`, and Output Directory to `dist`.

## ML Recommendation Engine

The system uses **LightFM** with Weighted Approximate-Rank Pairwise (WARP) loss:

- **Interaction Weights**: complete=5.0, rate=rating, bookmark=3.0, click=1.0, view=0.5
- **Training**: 30 epochs, 4 threads, 64 latent components
- **Prediction**: Filters already-completed items, returns top-10

### Train the Model

```bash
# Login as admin, then trigger training via API:
curl -X POST http://localhost:8000/api/v1/recommendations/train \
  -H "Authorization: Bearer <admin_token>"
```

## 📁 Project Structure

```
AdaptiveLearningSystem/
├── docker-compose.yml          # All services orchestration
├── .env                        # Environment variables
├── backend/
│   ├── Dockerfile              # Multi-stage Python build
│   ├── requirements.txt        # Python dependencies
│   ├── alembic.ini             # Migration config
│   ├── alembic/                # Database migrations
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── config.py           # Settings
│       ├── database.py         # Async SQLAlchemy
│       ├── models/             # SQLAlchemy models
│       ├── schemas/            # Pydantic schemas
│       ├── api/                # Routes & auth
│       ├── ml/                 # LightFM engine
│       ├── tasks/              # Celery tasks
│       └── seed.py             # Sample data
├── frontend/
│   ├── Dockerfile              # Node 18 dev server
│   └── src/
│       ├── App.jsx             # Router + layout
│       ├── pages/              # Login, Register, Dashboard, Profile
│       ├── components/         # Navbar, CourseCard, etc.
│       ├── store/              # Zustand auth state
│       └── api/                # Axios client
└── README.md
```

## 🛠️ Tech Stack

| Layer      | Technology                           |
|------------|--------------------------------------|
| Frontend   | React 18, Vite, TailwindCSS, Zustand |
| Backend    | FastAPI, SQLAlchemy (async), Alembic  |
| ML Engine  | LightFM, scikit-learn, scipy         |
| Database   | PostgreSQL 15                        |
| Cache      | Redis 7                              |
| Task Queue | Celery                               |
| Auth       | JWT (python-jose), bcrypt            |
| Container  | Docker, Docker Compose               |

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` — Create account
- `POST /api/v1/auth/demo-register` — Create a temporary verified demo account
- `POST /api/v1/auth/verify-otp` — Verify registration or login OTP and get JWT token
- `POST /api/v1/auth/resend-otp` — Resend registration OTP
- `POST /api/v1/auth/login` — Verify password and send login OTP
- `GET /api/v1/auth/me` — Current user profile
- `PATCH /api/v1/auth/me` — Update profile

### Content
- `GET /api/v1/content/` — List content (with filters)
- `GET /api/v1/content/{id}` — Get content by ID
- `POST /api/v1/content/` — Create content (admin)
- `DELETE /api/v1/content/{id}` — Delete content (admin)

### Interactions
- `POST /api/v1/interactions/` — Log interaction
- `GET /api/v1/interactions/history` — User history

### Recommendations
- `GET /api/v1/recommendations/` — Personalized recommendations
- `POST /api/v1/recommendations/train` — Trigger training (admin)
- `GET /api/v1/recommendations/train/{task_id}/status` — Training status
- `GET /api/v1/recommendations/trending` — Trending content (public)

### Health
- `GET /health` — System health check

## 📄 License

MIT
