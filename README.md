# Climate Change Website

A full-stack web application with FastAPI backend and React frontend.

## Project Structure

- `backend/`: FastAPI application
- `frontend/`: React application

## Setup

1. Ensure Python 3.8+ and Node.js 14+ are installed.

2. Backend dependencies are installed in the virtual environment at `.venv`.

3. Frontend dependencies are installed via npm.

## Running the Application

### Backend
- Use the VS Code task "Run Backend Server" to start the FastAPI server.
- Or manually: Activate the virtual environment and run `uvicorn main:app --reload` from the `backend` directory.
- Server runs on http://127.0.0.1:8000

### Frontend
- Run `npm start` from the `frontend` directory.
- Server runs on http://localhost:3000

## API Endpoints

- GET /: Returns {"Hello": "World"}
- GET /items/{item_id}: Returns item information

## Development

- Backend: Modify `backend/main.py`
- Frontend: Modify files in `frontend/src/`
