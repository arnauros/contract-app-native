import { execSync } from "child_process";
import { platform } from "os";
import { existsSync } from "fs";

// Get OS-specific host file info
const isWindows = platform() === "win32";
const isMac = platform() === "darwin";
const isLinux = platform() === "linux";

// Print instructions
console.log("\n============= HOW TO FIX YOUR LOCALHOST ISSUE =============\n");

console.log(
  'The problem: Your system is resolving "localhost" to "app.localhost"'
);
console.log(
  "This is happening at the DNS/hosts level, not in your Next.js code.\n"
);

if (isMac || isLinux) {
  console.log("To fix this on macOS/Linux:");
  console.log("1. Run this command as administrator/root:");
  console.log("   sudo nano /etc/hosts");
  console.log("2. Make sure you have BOTH of these lines in your hosts file:");
  console.log("   127.0.0.1       localhost");
  console.log("   127.0.0.1       app.localhost");
  console.log("3. Save the file (Ctrl+O, Enter, then Ctrl+X)\n");

  // Show current hosts file content
  try {
    console.log("Your current hosts file content:");
    const hostsContent = execSync("cat /etc/hosts").toString();
    console.log(hostsContent);
  } catch (error) {
    console.error("Error reading hosts file:", error.message);
  }
} else if (isWindows) {
  console.log("To fix this on Windows:");
  console.log("1. Open Notepad as Administrator");
  console.log("2. Open the file: C:\\Windows\\System32\\drivers\\etc\\hosts");
  console.log("3. Make sure you have BOTH of these lines in your hosts file:");
  console.log("   127.0.0.1       localhost");
  console.log("   127.0.0.1       app.localhost");
  console.log("4. Save the file\n");
}

console.log("\nIn the meantime, you can access your site using:");
console.log("http://127.0.0.1:3000\n");

console.log("To open your site using IP address (bypassing hostname):");
console.log("npm run open-ip\n");
