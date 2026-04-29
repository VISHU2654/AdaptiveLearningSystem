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

## 🧠 ML Recommendation Engine

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
- `POST /api/v1/auth/login` — Get JWT token
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
