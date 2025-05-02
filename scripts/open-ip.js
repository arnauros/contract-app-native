// Script to open the browser with the IP address to bypass hostname resolution
import { exec } from "child_process";

// Determine the operating system and use the appropriate open command
const openCommand =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
    ? "start"
    : "xdg-open";

// The URL using IP address instead of hostname
const url = "http://127.0.0.1:3000";

console.log(`Opening ${url} in your default browser...`);
console.log(
  "This uses the IP address directly to bypass hostname resolution issues"
);

// Execute the open command
exec(`${openCommand} "${url}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error opening browser: ${error}`);
    return;
  }
  console.log("Browser opened successfully!");
});
