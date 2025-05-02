#!/bin/bash

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Check if app.local already exists in hosts file
if grep -q "app.local" /etc/hosts; then
  echo "app.local already exists in your hosts file."
  exit 0
fi

# Add app.local to hosts file
echo "127.0.0.1 app.local" >> /etc/hosts

echo "Successfully added app.local to your hosts file."
echo "You can now access http://app.local:3000 in your browser."
echo "Non-authenticated users should be redirected to the signup page." 