#!/usr/bin/env node

/**
 * This script helps diagnose and fix localhost to app.local redirections
 */

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

console.log("🔍 LOCALHOST REDIRECTION DIAGNOSTIC TOOL 🔍");
console.log("-------------------------------------------");

// Check hosts file
console.log("\n📋 CHECKING HOSTS FILE:");
try {
  const hostsContent = fs.readFileSync("/etc/hosts", "utf8");
  const localLines = hostsContent
    .split("\n")
    .filter(
      (line) =>
        line.includes("localhost") ||
        line.includes("app.local") ||
        line.includes("app.localhost") ||
        line.includes("127.0.0.1")
    );

  console.log("Hosts file entries for local domains:");
  localLines.forEach((line) => console.log(`   ${line}`));

  // Check for potentially problematic configurations
  const hasLocalhost = localLines.some(
    (line) =>
      line.includes("127.0.0.1") &&
      line.includes("localhost") &&
      !line.includes("#")
  );
  const hasAppLocal = localLines.some(
    (line) => line.includes("app.local") && !line.includes("#")
  );

  if (!hasLocalhost) {
    console.log("\n⚠️ WARNING: No valid localhost entry found in hosts file");
  }

  if (hasAppLocal) {
    console.log("\n✓ Found app.local entry in hosts file");
  } else {
    console.log("\n⚠️ No app.local entry found in hosts file");
  }
} catch (err) {
  console.error("Error reading hosts file:", err.message);
}

// Check DNS resolution
console.log("\n📶 CHECKING DNS RESOLUTION:");
try {
  const localhostLookup = execSync("host localhost").toString();
  console.log("localhost resolves to:");
  console.log(`   ${localhostLookup.trim()}`);

  try {
    const appLocalLookup = execSync("host app.local").toString();
    console.log("app.local resolves to:");
    console.log(`   ${appLocalLookup.trim()}`);
  } catch (e) {
    console.log("app.local does not resolve (expected if not in hosts)");
  }
} catch (err) {
  console.error("Error checking DNS:", err.message);
}

// Check browser caches and network
console.log("\n🌐 BROWSER CACHE AND COOKIES:");
console.log("1. Try clearing your browser cache and cookies");
console.log("2. Check browser network tab for redirect chains");
console.log("3. Use curl to test redirection without browser:");
console.log("   curl -v http://localhost:3001/");

// Check middleware in the codebase
console.log("\n🔧 MIDDLEWARE CHECKS:");
try {
  const files = [
    "./middleware.js",
    "./src/middleware.ts",
    "./src/app/Components/ClientApp.tsx",
    "./src/app/Components/RedirectToDashboard.tsx",
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`\nChecking ${file}:`);
      const content = fs.readFileSync(file, "utf8");

      // Look for redirection code
      const redirectLines = content
        .split("\n")
        .map((line, i) => ({ line, i: i + 1 }))
        .filter(
          ({ line }) =>
            line.includes("redirect") ||
            line.includes("location.href") ||
            line.includes("app.local")
        );

      if (redirectLines.length > 0) {
        console.log(
          `Found ${redirectLines.length} potential redirect-related lines:`
        );
        redirectLines.forEach(({ line, i }) => {
          console.log(`   Line ${i}: ${line.trim()}`);
        });
      } else {
        console.log("No obvious redirect code found.");
      }
    }
  }
} catch (err) {
  console.error("Error checking middleware:", err.message);
}

// Recommendations
console.log("\n📋 RECOMMENDATIONS:");
console.log("1. Ensure hosts file has correct entries:");
console.log("   127.0.0.1    localhost");
console.log("   127.0.0.1    app.local  (if you need app.local)");
console.log("2. Try accessing with curl to bypass browser caches");
console.log("3. Check network tab in browser dev tools to see redirect chain");
console.log("4. Clear browser cookies and cache");
console.log("5. Try a different browser");
console.log("\nIf all else fails, create a direct-access HTML file:");
console.log("Open a new HTML file directly in your browser with this content:");
console.log(`
<!DOCTYPE html>
<html>
<head>
  <title>Direct Access</title>
</head>
<body>
  <h1>Direct Access Links</h1>
  <ul>
    <li><a href="http://localhost:3001" target="_blank">localhost:3001</a></li>
    <li><a href="http://127.0.0.1:3001" target="_blank">127.0.0.1:3001</a></li>
  </ul>
</body>
</html>
`);
