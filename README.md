# Climate Action Hub

A full-stack climate change awareness website with sign in, profile, news, community, and rewards sections.

## What this app includes

- User sign up and sign in with a simple backend API
- Profile section to update your mission, location, and bio
- Climate news feed with action items that reward points
- Community section for posts, replies, and peer support
- Rewards section where points can be redeemed for climate-friendly benefits
- Persistent backend data store using `backend/data_store.json`

## Project structure

- `backend/`: FastAPI server code and data store
- `frontend/`: React web application

## Setup

### Backend

1. From the project root, activate the virtual environment:
   - `& .venv\Scripts\Activate.ps1`
2. Install dependencies:
   - `pip install -r backend/requirements.txt`
3. Start the backend:
   - `cd backend`
   - `uvicorn main:app --reload`
4. The backend runs on `http://127.0.0.1:8000`

### Frontend

1. Open a new terminal in the project root.
2. Install frontend dependencies:
   - `cd frontend`
   - `npm install`
3. Start the React app:
   - `npm start`
4. The frontend runs on `http://localhost:3000`

## Using the app

- Create an account with sign up or sign in with an existing account.
- Explore the news section and complete actions to earn points.
- Share questions or climate updates in the community.
- Claim rewards with earned points.

## API Endpoints

- `POST /auth/signup`
- `POST /auth/login`
- `GET /users/me`
- `PUT /users/me`
- `GET /news`
- `POST /news/{news_id}/action`
- `GET /community/posts`
- `POST /community/posts`
- `POST /community/posts/{post_id}/reply`
- `GET /rewards`
- `POST /rewards/claim`
