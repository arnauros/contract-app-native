// Script to open a local HTML file that will redirect to the app via IP address
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get the directory path of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Go up one level to get the project root
const projectRoot = path.resolve(__dirname, "..");

// Path to the HTML file
const htmlFilePath = path.join(projectRoot, "direct-access.html");

// Check if the file exists first
try {
  fs.accessSync(htmlFilePath, fs.constants.F_OK);
  console.log("HTML redirect file found, opening it in browser...");
} catch (err) {
  console.error(`HTML redirect file not found at ${htmlFilePath}`);
  process.exit(1);
}

// Determine the operating system and use the appropriate open command
const openCommand =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
    ? "start"
    : "xdg-open";

// Create a file URL (important for local files)
const fileUrl = `file://${htmlFilePath}`;

console.log(`\n==== DIRECT BROWSER ACCESS ====`);
console.log(
  `Opening local HTML file that will redirect to your app via IP address`
);
console.log(`This approach bypasses any DNS or hostname issues`);

// Execute the open command
exec(`${openCommand} "${fileUrl}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error opening browser: ${error.message}`);
    console.log(`\nPlease manually open this file in your browser:`);
    console.log(htmlFilePath);
    return;
  }
  console.log(`\n✅ Local redirect file opened successfully!`);
  console.log(`This should immediately redirect you to http://127.0.0.1:3000`);
  console.log(
    `If that fails, the page has options to try http://127.0.0.1:3005`
  );
});
