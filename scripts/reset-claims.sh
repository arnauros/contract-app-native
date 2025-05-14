#!/bin/bash

# Reset Claims Shell Script
# This script will make multiple attempts to reset a user's claims

# Check if a user ID was provided
if [ -z "$1" ]; then
  echo "Error: User ID is required"
  echo "Usage: ./scripts/reset-claims.sh <userId>"
  exit 1
fi

USER_ID=$1
ATTEMPTS=5
BASE_URL="http://localhost:3000"

echo "Starting claims reset process for user: $USER_ID"
echo "Will make $ATTEMPTS attempts..."

for i in $(seq 1 $ATTEMPTS); do
  echo ""
  echo "Attempt $i of $ATTEMPTS:"
  
  # Make the API call to reset claims
  echo "Resetting claims..."
  curl -s -X POST "$BASE_URL/api/debug/reset-claims" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$USER_ID\"}" | jq .
  
  # Wait a moment for the claims to propagate
  echo "Waiting for claims to propagate..."
  sleep 2
  
  # Check the claims
  echo "Checking claims..."
  curl -s -X POST "$BASE_URL/api/debug/auth-claims" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$USER_ID\"}" | jq .
  
  echo "Waiting 3 seconds before next attempt..."
  sleep 3
done

echo ""
echo "Reset process completed. If you continue to have permission issues:"
echo "1. Go to the dashboard and use the DebugClaims UI component"
echo "2. Try restarting your browser to ensure a fresh session"
echo "3. Make sure your database has the correct subscription data" 