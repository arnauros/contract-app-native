#!/bin/bash

# Check if script is run with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Backup hosts file
cp /etc/hosts /etc/hosts.bak
echo "Backed up hosts file to /etc/hosts.bak"

# Check if entries exist and add them if not
if ! grep -q "^127.0.0.1[[:space:]]\+localhost$" /etc/hosts; then
  echo "Adding localhost entry..."
  echo "127.0.0.1       localhost" >> /etc/hosts
else
  echo "localhost entry already exists"
fi

if ! grep -q "^127.0.0.1[[:space:]]\+app.localhost$" /etc/hosts; then
  echo "Adding app.localhost entry..."
  echo "127.0.0.1       app.localhost" >> /etc/hosts
else
  echo "app.localhost entry already exists"
fi

echo "Done! Your hosts file now has proper entries for localhost and app.localhost"
echo "Now you can access:"
echo "  - Main landing page: http://localhost:3000"
echo "  - App subdomain: http://app.localhost:3000" 