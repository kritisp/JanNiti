# JanVikas AI - Decision Support Platform for Development Planning

JanVikas AI is a production-ready, enterprise-grade AI decision support platform designed to assist Members of Parliament (MPs) and local governing authorities in prioritizing development projects. By analyzing multilingual citizen feedback, local demographic structures, infrastructure gaps, GIS datasets, and public datasets using Explainable AI, the platform translates feedback into actionable, high-impact regional planning.

> [!NOTE]
> JanVikas AI is **not** a complaint management system. It is an analytics and decision-support tool focused on optimization, resource allocation, and spatial-demographic planning.

---

## 🏛 Architecture Overview

JanVikas AI uses a decoupled **mono-repository** layout to simplify code-sharing while allowing independent, scalable, and zero-downtime deployment pipelines.

* **`/frontend`**: React with Vite, TypeScript, React Router, React Query, Tailwind CSS, Leaflet for GIS mapping, Recharts for visual intelligence, and Framer Motion for premium micro-animations.
* **`/backend`**: FastAPI (Python), SQLAlchemy ORM, Pydantic data validation, and PostgreSQL for structured data persistence.
* **`/shared`**: Shared resources, schemas, and configurations.
* **`/docs`**: In-depth design papers and architectural references.

---

## 🚀 One-Click Render Deployment

JanVikas AI is configured for one-click deployment using Render Blueprints (`render.yaml`). When you connect this repository to Render:

1. A managed **PostgreSQL Database** (`janvikas-db`) is spun up.
2. The **FastAPI Backend** (`janvikas-backend`) compiles, builds, and boots.
3. The **React SPA Frontend** (`janvikas-frontend`) compiles to optimized static assets and hosts them on a Global CDN, referencing the backend API directly.

To deploy, simply go to your Render Dashboard, click **New > Blueprint Route**, and select this repository.

---

## 💻 Local Setup & Development

### Prerequisites
* Python 3.10+
* Node.js 18+ (npm or yarn)
* PostgreSQL database instance running locally

### 1. Backend Setup
1. Change into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure local environment variables:
   Copy `.env.example` to `.env` and fill in your local Postgres connection details and Google Gemini API keys:
   ```bash
   cp .env.example .env
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   * Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to view the Swagger API docs.
   * Health endpoint is available at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health).

### 2. Frontend Setup
1. Change into the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * The app will run on [http://localhost:5173](http://localhost:5173). Calls to `/api` will be proxied to the backend automatically.

---

## 🔒 Configuration Matrix

### Backend (`/backend/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/janvikas` |
| `GEMINI_API_KEY` | Google Gemini developer key | `AIzaSy...` |
| `SECRET_KEY` | Cryptographic secret for signing JWTs | `generate-a-secure-random-key` |
| `ENVIRONMENT` | Run environment (`development`/`production`) | `development` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | `http://localhost:5173,http://127.0.0.1:5173` |

### Frontend (`/frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the API Backend (Omit in local dev for Proxying) | `http://localhost:8000` |
