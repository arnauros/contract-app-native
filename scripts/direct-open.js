// Direct browser opening script that bypasses any hostname issues
import { exec } from "child_process";
import http from "http";

// The URL using IP address instead of hostname
const TARGET_URL = "http://127.0.0.1:3000";
const openCommand =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
    ? "start"
    : "xdg-open";

console.log("\n==== DIRECT BROWSER LAUNCHER ====");
console.log(`Opening ${TARGET_URL} directly to bypass ANY hostname issues...`);

// First check if the site is running
try {
  const req = http.request(TARGET_URL, { method: "HEAD" }, (res) => {
    console.log(`Server responded with status code: ${res.statusCode}`);

    if (res.statusCode === 200) {
      // Site is running, open it directly
      exec(`${openCommand} "${TARGET_URL}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error opening browser: ${error.message}`);
          return;
        }
        console.log("✅ Browser opened successfully with IP address!");
      });
    } else {
      console.error(`⚠️ Server responded with status code ${res.statusCode}`);
      console.log(
        "Make sure your Next.js dev server is running with 'npm run dev'"
      );
    }
  });

  req.on("error", (e) => {
    console.error(`⚠️ Cannot connect to server: ${e.message}`);
    console.log(
      "Is your Next.js development server running? Try 'npm run dev' first."
    );
  });

  req.end();
} catch (error) {
  console.error(`Error checking server: ${error.message}`);
}

// Output special instructions
console.log("\n⭐ IMPORTANT BROWSER INSTRUCTIONS ⭐");
console.log("If your browser still redirects to app.localhost:");
console.log("1. Try opening a private/incognito window");
console.log("2. Clear your browser cookies and cache");
console.log("3. Try a different browser");
console.log("4. Manually type http://127.0.0.1:3000 in the address bar\n");
