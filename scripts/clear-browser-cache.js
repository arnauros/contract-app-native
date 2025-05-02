// Script to help users clear browser cache and cookies for localhost
import { exec } from "child_process";
import readline from "readline";

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n=== LOCALHOST BROWSER CACHE CLEANER ===\n");
console.log("This utility will help you clear browser cache for localhost.");
console.log("Choose your primary browser to get instructions:\n");
console.log("1. Chrome");
console.log("2. Firefox");
console.log("3. Safari");
console.log("4. Edge");
console.log("5. Open direct access page (bypasses cache issues)");
console.log("6. Exit\n");

rl.question("Enter your choice (1-6): ", (answer) => {
  switch (answer.trim()) {
    case "1":
      showChromeInstructions();
      break;
    case "2":
      showFirefoxInstructions();
      break;
    case "3":
      showSafariInstructions();
      break;
    case "4":
      showEdgeInstructions();
      break;
    case "5":
      openDirectAccess();
      break;
    case "6":
    default:
      rl.close();
      break;
  }
});

function showChromeInstructions() {
  console.log("\nChrome Instructions:");
  console.log(
    "1. Open Chrome and press CMD+SHIFT+DELETE (Mac) or CTRL+SHIFT+DELETE (Windows/Linux)"
  );
  console.log("2. Change time range to 'All time'");
  console.log(
    "3. Check 'Cookies and other site data' and 'Cached images and files'"
  );
  console.log("4. Click 'Clear data'\n");

  openBrowserOption();
}

function showFirefoxInstructions() {
  console.log("\nFirefox Instructions:");
  console.log(
    "1. Open Firefox and press CMD+SHIFT+DELETE (Mac) or CTRL+SHIFT+DELETE (Windows/Linux)"
  );
  console.log("2. Change time range to 'Everything'");
  console.log("3. Check 'Cookies' and 'Cache'");
  console.log("4. Click 'Clear Now'\n");

  openBrowserOption();
}

function showSafariInstructions() {
  console.log("\nSafari Instructions:");
  console.log("1. Open Safari and go to Safari > Preferences > Privacy");
  console.log("2. Click 'Manage Website Data'");
  console.log("3. Search for 'localhost' and select it");
  console.log("4. Click 'Remove' and then 'Done'");
  console.log("5. Go to Safari > Preferences > Advanced");
  console.log("6. Check 'Show Develop menu in menu bar'");
  console.log("7. Go to Develop > Empty Caches\n");

  openBrowserOption();
}

function showEdgeInstructions() {
  console.log("\nEdge Instructions:");
  console.log(
    "1. Open Edge and press CMD+SHIFT+DELETE (Mac) or CTRL+SHIFT+DELETE (Windows)"
  );
  console.log("2. Change time range to 'All time'");
  console.log(
    "3. Check 'Cookies and other site data' and 'Cached images and files'"
  );
  console.log("4. Click 'Clear now'\n");

  openBrowserOption();
}

function openBrowserOption() {
  rl.question(
    "Would you like to open the direct access page to bypass cache issues? (y/n): ",
    (answer) => {
      if (answer.toLowerCase() === "y") {
        openDirectAccess();
      } else {
        rl.close();
      }
    }
  );
}

function openDirectAccess() {
  const openCommand =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
      ? "start"
      : "xdg-open";

  // First try the IP address directly to bypass hostname issues
  const url = "http://127.0.0.1:3000?nocache=" + Date.now();
  console.log(`\nOpening ${url} in your default browser...`);

  exec(`${openCommand} "${url}"`, (error) => {
    if (error) {
      console.error(`Error opening browser: ${error.message}`);
    } else {
      console.log("Browser opened successfully!");
    }
    rl.close();
  });
}

rl.on("close", () => {
  console.log("\nThank you for using the cache cleaner!");
  console.log("Your localhost page should now load correctly in normal mode.");
  process.exit(0);
});
