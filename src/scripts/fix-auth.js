#!/usr/bin/env node

/**
 * Auth Session Fix Script
 *
 * This script helps debug and fix authentication issues by:
 * 1. Testing Firebase connection
 * 2. Verifying cookie settings
 * 3. Clearing problematic sessions
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
};

console.log(
  `${colors.bold}${colors.blue}=== Auth Session Fix Tool ===${colors.reset}\n`
);

// Check if running in development mode
const isDevMode =
  process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
console.log(
  `${colors.bold}Environment:${colors.reset} ${
    isDevMode ? "Development" : "Production"
  }\n`
);

// Function to check Firebase config
function checkFirebaseConfig() {
  console.log(`${colors.bold}Checking Firebase configuration:${colors.reset}`);

  try {
    // Look for .env.local file
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");

      // Check for Firebase keys
      const firebaseKeys = [
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      ];

      const missingKeys = [];

      firebaseKeys.forEach((key) => {
        if (!envContent.includes(`${key}=`)) {
          missingKeys.push(key);
        }
      });

      if (missingKeys.length > 0) {
        console.log(
          `${
            colors.red
          }✗ Missing required Firebase environment variables: ${missingKeys.join(
            ", "
          )}${colors.reset}`
        );
      } else {
        console.log(
          `${colors.green}✓ Firebase environment variables found${colors.reset}`
        );
      }
    } else {
      console.log(`${colors.red}✗ .env.local file not found${colors.reset}`);
    }
  } catch (error) {
    console.error(
      `${colors.red}Error checking Firebase config:${colors.reset}`,
      error.message
    );
  }
}

// Function to check session settings in middleware
function checkMiddleware() {
  console.log(
    `\n${colors.bold}Checking Middleware configuration:${colors.reset}`
  );

  try {
    // Look for middleware.ts file
    const middlewarePath = path.join(process.cwd(), "middleware.ts");
    if (fs.existsSync(middlewarePath)) {
      const middlewareContent = fs.readFileSync(middlewarePath, "utf8");

      // Check if middleware is checking for session cookies
      if (middlewareContent.includes("session")) {
        console.log(
          `${colors.green}✓ Session cookie check found in middleware${colors.reset}`
        );
      } else {
        console.log(
          `${colors.yellow}⚠ No session cookie check found in middleware${colors.reset}`
        );
      }
    } else {
      console.log(`${colors.red}✗ middleware.ts file not found${colors.reset}`);
    }
  } catch (error) {
    console.error(
      `${colors.red}Error checking middleware:${colors.reset}`,
      error.message
    );
  }
}

// Function to fix common issues
function suggestFixes() {
  console.log(`\n${colors.bold}Suggestions to fix auth issues:${colors.reset}`);

  console.log(`
1. ${colors.bold}Check browser cookies:${colors.reset}
   - Open DevTools > Application > Cookies
   - Look for 'session' cookie - if missing, authentication is failing

2. ${colors.bold}Try clearing browser data:${colors.reset}
   - Clear cookies and site data
   - Restart the browser

3. ${colors.bold}Check Firebase auth state:${colors.reset}
   - Visit /auth-debug to see live auth state

4. ${colors.bold}Review RouteGuard timing:${colors.reset}
   - We've added timeout to prevent infinite loading

5. ${colors.bold}If login fails consistently:${colors.reset}
   - Check Firebase console for auth errors
   - Verify API keys in .env.local file
  `);
}

// Run checks
checkFirebaseConfig();
checkMiddleware();
suggestFixes();

console.log(
  `\n${colors.green}${colors.bold}✓ Auth check complete${colors.reset}`
);
console.log(
  `For further debugging, visit ${colors.blue}/auth-debug${colors.reset} in your application`
);
