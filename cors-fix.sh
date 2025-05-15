#!/bin/bash

# Create a CORS configuration file
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Access-Control-Allow-Origin",
      "ETag",
      "X-Download-Options",
      "X-Request-Id",
      "X-Content-Type-Options",
      "X-Goog-Meta-Foo",
      "X-Goog-Upload-Protocol",
      "X-Goog-Upload-Status",
      "X-Goog-Upload-URL",
      "X-Goog-Upload-Command",
      "X-Goog-Upload-Offset",
      "X-Goog-Upload-Size-Received",
      "X-Content-Type-Options",
      "Cache-Control",
      "Authorization"
    ]
  }
]
EOF

# Find your Firebase Storage bucket name from the Firebase config
BUCKET_NAME="freelance-project-3d0b5.appspot.com"
echo "Using Firebase Storage bucket: $BUCKET_NAME"

# Apply CORS configuration to the bucket
echo "Setting CORS configuration for gs://$BUCKET_NAME..."
gsutil cors set cors.json gs://$BUCKET_NAME

echo "Done! CORS configuration has been updated for your Firebase Storage bucket."
echo "You may need to wait a few minutes for the changes to propagate." 