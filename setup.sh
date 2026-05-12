#!/bin/bash

# Bouncer Setup Script

echo "Setting up Bouncer PDP Application..."

# Check if Podman is available
if command -v podman &> /dev/null; then
    echo "Starting PostgreSQL with Podman..."
    podman-compose up -d
    
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    echo "Database should be ready. You can now start the API and UI."
elif command -v docker &> /dev/null; then
    echo "Starting PostgreSQL with Docker..."
    docker compose up -d
    
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    echo "Database should be ready. You can now start the API and UI."
else
    echo "Podman/Docker not found. Please set up PostgreSQL manually:"
    echo "1. Install PostgreSQL 15+"
    echo "2. Create database 'bouncer' with user 'bouncer' and password 'bouncer_password'"
    echo "3. Run the migration scripts from database/migrations/"
    echo "4. Run the seed script from database/seeds/"
fi

echo ""
echo "To start the API:"
echo "  cd api"
echo "  npm install"
echo "  npm run dev"
echo ""
echo "To start the UI:"
echo "  cd ui"
echo "  npm install"
echo "  npm run dev"
echo ""
echo "API will be available at http://localhost:3001"
echo "UI will be available at http://localhost:5173"
