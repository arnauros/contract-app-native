#!/bin/bash

# Script to fix common host file issues for running the app locally
# This adds proper entries for localhost and clears incorrect entries

HOSTS_FILE="/etc/hosts"

# Check if the script is running with sudo/root permissions
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo ./fix-host.sh"
  exit 1
fi

# Check if localhost entry exists
if ! grep -q "^127.0.0.1[[:space:]]\+localhost$" /etc/hosts; then
  echo "Adding localhost entry..."
  echo "127.0.0.1       localhost" >> /etc/hosts
else
  echo "localhost entry already exists"
fi

echo "Done! Your hosts file now has proper entries for localhost"
echo ""
echo "You can now access:"
echo "  - Main app: http://localhost:3000" 