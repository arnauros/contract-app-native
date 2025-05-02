// Script to start the app on an alternative port and open it directly
import { exec, spawn } from "child_process";
import http from "http";

const ALT_PORT = 3005;
const URL = `http://127.0.0.1:${ALT_PORT}`;
const openCommand =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
    ? "start"
    : "xdg-open";

console.log("\n=== RUNNING ON ALTERNATIVE PORT ===");
console.log(
  `Starting Next.js on port ${ALT_PORT} to bypass hostname DNS issues`
);
console.log("Please wait while the server starts...\n");

// Kill any existing process on the port
try {
  if (process.platform === "darwin" || process.platform === "linux") {
    exec(`lsof -ti:${ALT_PORT} | xargs kill -9`, () => {
      startServer();
    });
  } else {
    // Windows
    exec(
      `FOR /F "tokens=5" %P IN ('netstat -aon ^| find ":${ALT_PORT}" ^| find "LISTENING"') DO taskkill /F /PID %P`,
      () => {
        startServer();
      }
    );
  }
} catch (e) {
  // If error, just start the server
  startServer();
}

// Start the Next.js server
function startServer() {
  // Start Next.js as a child process
  const nextProcess = spawn(
    "npx",
    ["next", "dev", "--port", ALT_PORT, "--turbopack"],
    {
      stdio: "inherit",
      shell: true,
    }
  );

  // Setup event handlers
  nextProcess.on("error", (err) => {
    console.error(`Failed to start Next.js server: ${err.message}`);
  });

  // Check if server is up and open browser
  let checkCount = 0;
  const checkInterval = setInterval(() => {
    checkCount++;

    const req = http.request(URL, { method: "HEAD" }, (res) => {
      if (res.statusCode === 200) {
        clearInterval(checkInterval);
        console.log(`\n✅ Server is running at ${URL}`);
        console.log("Opening browser...");

        // Open the browser
        exec(`${openCommand} "${URL}"`, (error) => {
          if (error) {
            console.error(`Error opening browser: ${error.message}`);
            console.log(`Please manually open ${URL} in your browser`);
          }
        });
      }
    });

    req.on("error", () => {
      if (checkCount > 30) {
        // Give up after ~30 seconds
        clearInterval(checkInterval);
        console.log(
          `\n⚠️ Server may still be starting. Please manually open ${URL} when it's ready.`
        );
      }
    });

    req.end();
  }, 1000); // Check every second
}

process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  process.exit(0);
});
