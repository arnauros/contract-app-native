#!/bin/bash

# Fix hostname script for Next.js app with localhost subdomains
echo "🚀 Running hostname fix script for Next.js app..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Detect OS
OS=$(uname)
echo "Detected OS: $OS"

# Set hosts file path based on OS
if [ "$OS" = "Darwin" ] || [ "$OS" = "Linux" ]; then
  HOSTS_FILE="/etc/hosts"
elif [ "$OS" = "Windows_NT" ]; then
  HOSTS_FILE="/c/Windows/System32/drivers/etc/hosts"
else
  echo "❌ Unsupported OS"
  exit 1
fi

echo "Using hosts file: $HOSTS_FILE"

# Check if localhost entries exist
LOCALHOST_ENTRY=$(grep -E "^127.0.0.1\s+localhost$" $HOSTS_FILE)
APP_LOCALHOST_ENTRY=$(grep -E "^127.0.0.1\s+app.localhost$" $HOSTS_FILE)

# Add missing entries
if [ -z "$LOCALHOST_ENTRY" ]; then
  echo "127.0.0.1 localhost" >> $HOSTS_FILE
  echo "✅ Added localhost entry"
else
  echo "✅ localhost entry already exists"
fi

if [ -z "$APP_LOCALHOST_ENTRY" ]; then
  echo "127.0.0.1 app.localhost" >> $HOSTS_FILE
  echo "✅ Added app.localhost entry"
else
  echo "✅ app.localhost entry already exists"
fi

# Clear DNS cache based on OS
if [ "$OS" = "Darwin" ]; then
  echo "Clearing DNS cache on macOS..."
  dscacheutil -flushcache
  killall -HUP mDNSResponder
  echo "✅ DNS cache cleared"
elif [ "$OS" = "Linux" ]; then
  echo "Clearing DNS cache on Linux..."
  if [ -x "$(command -v systemd-resolve)" ]; then
    systemd-resolve --flush-caches
  elif [ -x "$(command -v service)" ]; then
    service nscd restart
  else
    echo "⚠️ Couldn't clear DNS cache automatically. Please flush your DNS cache manually."
  fi
elif [ "$OS" = "Windows_NT" ]; then
  echo "Clearing DNS cache on Windows..."
  ipconfig /flushdns
  echo "✅ DNS cache cleared"
fi

echo ""
echo "🎉 Hostname fix completed!"
echo ""
echo "To complete the setup:"
echo "1. Restart your browser"
echo "2. Restart your Next.js development server with: npm run dev"
echo "3. Access your app at http://localhost:3000 and http://app.localhost:3000"
echo ""
echo "If you still experience issues, try:"
echo "- Using a private/incognito browser window"
echo "- Clearing browser cookies and cache"
echo "- Restarting your computer" 