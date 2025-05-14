import { exec } from "child_process";

console.log("\n============= TESTING APP.LOCAL REDIRECTION =============\n");

console.log(
  "This script will open browser windows to test different domain behaviors:"
);
console.log("1. localhost:3000 - Should load normally without redirection");
console.log(
  "2. app.local:3000 - Should redirect to signup if not authenticated\n"
);

console.log("Make sure you've added app.local to your hosts file:");
console.log("sudo ./scripts/add-app-local.sh\n");

console.log("Opening test URLs in 3 seconds...");

// Wait 3 seconds then open URLs
setTimeout(() => {
  // Open localhost:3000
  console.log("\nOpening http://localhost:3000");
  exec("open http://localhost:3000");

  // Wait 2 seconds and open app.local:3000
  setTimeout(() => {
    console.log("Opening http://app.local:3000");
    console.log("If not logged in, you should be redirected to signup page");
    exec("open http://app.local:3000");
  }, 2000);
}, 3000);
