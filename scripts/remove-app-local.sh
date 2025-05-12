#!/bin/bash

# Script to remove app.local and app.localhost entries from hosts file
# Must be run with sudo permission

HOSTS_FILE="/etc/hosts"

# Check if the script is running with sudo/root permissions
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo ./scripts/remove-app-local.sh"
  exit 1
fi

# Create backup of hosts file
cp $HOSTS_FILE ${HOSTS_FILE}.bak
echo "Created backup at ${HOSTS_FILE}.bak"

# Check which entries exist
APP_LOCAL_EXISTS=$(grep -c "app.local" $HOSTS_FILE)
APP_LOCALHOST_EXISTS=$(grep -c "app.localhost" $HOSTS_FILE)

echo "Found in hosts file:"
if [ $APP_LOCAL_EXISTS -gt 0 ]; then
  echo "- app.local entries: $APP_LOCAL_EXISTS"
else
  echo "- app.local entries: none"
fi

if [ $APP_LOCALHOST_EXISTS -gt 0 ]; then
  echo "- app.localhost entries: $APP_LOCALHOST_EXISTS"
else
  echo "- app.localhost entries: none"
fi

# Remove any app.local or app.localhost entries (macOS compatible)
if [ "$(uname)" == "Darwin" ]; then
  # macOS version
  sed -i '' '/app\.local/d' $HOSTS_FILE
  sed -i '' '/app\.localhost/d' $HOSTS_FILE
else
  # Linux version
  sed -i '/app\.local/d' $HOSTS_FILE
  sed -i '/app\.localhost/d' $HOSTS_FILE
fi

echo ""
echo "✅ Removed all app.local and app.localhost entries from hosts file"
echo ""
echo "Next steps:"
echo "1. Restart your browser completely (quit and reopen)"
echo "2. Clear browser DNS cache"
echo "3. Access your app at http://localhost:3000"
echo ""
echo "If you still have issues, try:"
echo "- Chrome: visit chrome://net-internals/#dns and click 'Clear host cache'"
echo "- On macOS: run 'sudo killall -HUP mDNSResponder' to flush DNS cache" 