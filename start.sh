#!/bin/bash

# Start script for Invoice Generator

echo "Starting Invoice Generator..."

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# Start backend
echo "Starting backend server..."
echo "Note: If this is your first time or your token expired, a browser window"
echo "will open for Google Drive authentication. If it doesn't, check backend.log"
cd backend
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || pip install -r requirements.txt
uvicorn main:app --reload --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Error: Backend failed to start. Check backend.log for details."
    exit 1
fi

# Start frontend
echo "Starting frontend server (logs in frontend.log)..."
cd frontend
npm install --silent 2>/dev/null || npm install
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 2

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "Error: Frontend failed to start. Check frontend logs."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "========================================="
echo "Invoice Generator is running!"
echo "========================================="
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "========================================="

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "Servers stopped."
    exit 0
}

# Wait for user interrupt
trap cleanup INT TERM

# Wait for processes
wait

