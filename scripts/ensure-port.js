// Script to ensure port 3000 is available
import { exec } from "child_process";

const PORT = 3000;

console.log(`\n=== ENSURING PORT ${PORT} IS AVAILABLE ===`);

// Kill any existing process on port 3000
try {
  if (process.platform === "darwin" || process.platform === "linux") {
    exec(`lsof -ti:${PORT} | xargs kill -9`, (error) => {
      if (error) {
        console.log(`No processes were running on port ${PORT}`);
      } else {
        console.log(`Killed processes on port ${PORT}`);
      }
      console.log(`Port ${PORT} is now available for use.\n`);
    });
  } else {
    // Windows
    exec(
      `FOR /F "tokens=5" %P IN ('netstat -aon ^| find ":${PORT}" ^| find "LISTENING"') DO taskkill /F /PID %P`,
      (error) => {
        if (error) {
          console.log(`No processes were running on port ${PORT}`);
        } else {
          console.log(`Killed processes on port ${PORT}`);
        }
        console.log(`Port ${PORT} is now available for use.\n`);
      }
    );
  }
} catch (e) {
  console.error(`Error checking port ${PORT}: ${e.message}`);
}
