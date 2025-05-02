// Comprehensive script to troubleshoot and fix the localhost redirect issue
import { exec, spawn } from "child_process";
import http from "http";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";

// Setup readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Get the directory path of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("\n======================================================");
console.log("           NEXT.JS LOCALHOST REDIRECT FIXER           ");
console.log("======================================================\n");

console.log(
  "This script will try multiple approaches to fix your localhost redirect issue.\n"
);

// Main menu function
function showMainMenu() {
  console.log("\nChoose an option to fix the issue:");
  console.log("1. Try direct IP access (127.0.0.1:3000)");
  console.log("2. Try alternative port (127.0.0.1:3005)");
  console.log("3. Use local HTML redirect file");
  console.log("4. Show info about fixing hosts file");
  console.log("5. Check DNS resolution");
  console.log("6. Restart Next.js server");
  console.log("7. Exit");

  rl.question("\nEnter your choice (1-7): ", (answer) => {
    switch (answer.trim()) {
      case "1":
        openDirectIpAccess();
        break;
      case "2":
        startAltPort();
        break;
      case "3":
        openLocalRedirect();
        break;
      case "4":
        showHostsFileInfo();
        break;
      case "5":
        checkDnsResolution();
        break;
      case "6":
        restartNextJs();
        break;
      case "7":
        rl.close();
        break;
      default:
        console.log("Invalid option, please try again.");
        showMainMenu();
    }
  });
}

// Functions for each option
function openDirectIpAccess() {
  console.log("\nTrying direct IP access...");
  const url = "http://127.0.0.1:3000";
  const openCommand = getOpenCommand();

  checkServerRunning(url, () => {
    exec(`${openCommand} "${url}"`, (error) => {
      if (error) {
        console.error(`Error opening browser: ${error.message}`);
      } else {
        console.log(`✅ Browser opened with ${url}`);
      }
      askToContinue();
    });
  });
}

function startAltPort() {
  console.log("\nStarting Next.js on alternative port 3005...");

  // Kill any existing process on port 3005
  if (process.platform === "darwin" || process.platform === "linux") {
    exec("lsof -ti:3005 | xargs kill -9 2>/dev/null || true");
  }

  // Start Next.js server on port 3005
  const nextProcess = spawn(
    "npx",
    ["next", "dev", "--port", "3005", "--turbopack"],
    {
      stdio: "inherit",
      shell: true,
      detached: true,
    }
  );

  nextProcess.unref();

  // Wait and then open browser
  setTimeout(() => {
    const url = "http://127.0.0.1:3005";
    const openCommand = getOpenCommand();

    exec(`${openCommand} "${url}"`, (error) => {
      if (error) {
        console.error(`Error opening browser: ${error.message}`);
      } else {
        console.log(`✅ Browser opened with ${url}`);
      }
      askToContinue();
    });
  }, 5000);
}

function openLocalRedirect() {
  console.log("\nOpening local HTML redirect file...");

  const htmlFilePath = path.join(projectRoot, "direct-access.html");
  const openCommand = getOpenCommand();

  try {
    fs.accessSync(htmlFilePath, fs.constants.F_OK);
    console.log("HTML redirect file found, opening in browser...");

    const fileUrl = `file://${htmlFilePath}`;
    exec(`${openCommand} "${fileUrl}"`, (error) => {
      if (error) {
        console.error(`Error opening browser: ${error.message}`);
      } else {
        console.log(`✅ Local redirect file opened successfully`);
      }
      askToContinue();
    });
  } catch (err) {
    console.error(
      `HTML redirect file not found. Please run 'npm run fix-hosts' first.`
    );
    askToContinue();
  }
}

function showHostsFileInfo() {
  console.log("\n=== HOSTS FILE INFORMATION ===");

  const hostsPath =
    process.platform === "win32"
      ? "C:\\Windows\\System32\\drivers\\etc\\hosts"
      : "/etc/hosts";

  console.log(`Your hosts file is located at: ${hostsPath}`);
  console.log(
    "\nTo fix the issue, you need to ensure you have these two separate entries:"
  );
  console.log("127.0.0.1  localhost");
  console.log("127.0.0.1  app.localhost");

  if (process.platform === "darwin" || process.platform === "linux") {
    console.log("\nYou can edit it with: sudo nano " + hostsPath);

    try {
      const hostsContent = fs.readFileSync(hostsPath, "utf8");
      console.log("\nCurrent hosts file content:");
      console.log("----------------------------");
      console.log(hostsContent);
      console.log("----------------------------");
    } catch (error) {
      console.log("Could not read hosts file content.");
    }
  } else if (process.platform === "win32") {
    console.log("\nOn Windows, you need to:");
    console.log("1. Open Notepad as Administrator");
    console.log("2. Open the hosts file at " + hostsPath);
    console.log("3. Make the changes and save");
  }

  askToContinue();
}

function checkDnsResolution() {
  console.log("\n=== DNS RESOLUTION CHECK ===");

  if (process.platform === "darwin" || process.platform === "linux") {
    exec("host localhost", (error, stdout) => {
      if (error) {
        console.log("Error checking localhost resolution:", error.message);
      } else {
        console.log("localhost resolves to:");
        console.log(stdout);
      }

      exec("host app.localhost", (error, stdout) => {
        if (error) {
          console.log(
            "Error checking app.localhost resolution:",
            error.message
          );
        } else {
          console.log("app.localhost resolves to:");
          console.log(stdout);
        }

        console.log(
          "\nIf localhost resolves to app.localhost, that's the issue."
        );
        askToContinue();
      });
    });
  } else {
    console.log("DNS resolution check is only supported on macOS and Linux.");
    askToContinue();
  }
}

function restartNextJs() {
  console.log("\nRestarting Next.js server...");

  // Kill existing Next.js processes
  if (process.platform === "darwin" || process.platform === "linux") {
    exec("lsof -ti:3000 | xargs kill -9 2>/dev/null || true");
    exec("lsof -ti:3005 | xargs kill -9 2>/dev/null || true");
  }

  // Start Next.js
  const nextProcess = spawn("npx", ["next", "dev", "--turbopack"], {
    stdio: "inherit",
    shell: true,
    detached: true,
  });

  nextProcess.unref();

  console.log(
    "Next.js server restarted. Please wait a moment for it to start up..."
  );
  setTimeout(() => {
    askToContinue();
  }, 5000);
}

// Helper functions
function getOpenCommand() {
  return process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
    ? "start"
    : "xdg-open";
}

function checkServerRunning(url, callback) {
  const req = http.request(url, { method: "HEAD" }, (res) => {
    if (res.statusCode === 200) {
      console.log(`Server is running at ${url}`);
      callback();
    } else {
      console.log(`Server responded with status code ${res.statusCode}`);
      callback();
    }
  });

  req.on("error", (e) => {
    console.error(`Cannot connect to server: ${e.message}`);
    console.log(
      "Is your Next.js development server running? Try option 6 to restart it."
    );
    askToContinue();
  });

  req.end();
}

function askToContinue() {
  rl.question("\nReturn to main menu? (Y/n): ", (answer) => {
    if (answer.toLowerCase() === "n") {
      rl.close();
    } else {
      showMainMenu();
    }
  });
}

// Start the menu
showMainMenu();

// Handle exit
rl.on("close", () => {
  console.log("\nThank you for using the localhost redirect fixer!");
  process.exit(0);
});
