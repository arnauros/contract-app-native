// Script to open the browser with the specific localhost URL
import { exec } from "child_process";
import { platform } from "os";

// Determine the operating system and use the appropriate open command
const openCommand =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
    ? "start"
    : "xdg-open";

// The URL we want to open
const url = "http://localhost:3000";

console.log(`Opening ${url} in your default browser...`);

// Execute the open command
exec(`${openCommand} "${url}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error opening browser: ${error}`);
    return;
  }
  console.log("Browser opened successfully!");
});

// Clear DNS cache
exec(`sudo dscacheutil -flushcache`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error clearing DNS cache: ${error}`);
    return;
  }
  console.log("DNS cache cleared successfully!");
});

// Restart mDNSResponder
exec(`sudo killall -HUP mDNSResponder`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error restarting mDNSResponder: ${error}`);
    return;
  }
  console.log("mDNSResponder restarted successfully!");
});
