import fetch from "node-fetch";

async function checkUserStatus(email) {
  try {
    console.log(`🔍 Checking user status for: ${email}`);

    // First, let's check if we can get user info from the dashboard
    const response = await fetch(
      "http://localhost:3000/api/protected-content",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API Response:", data);
    } else {
      console.log("❌ API Error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Error checking user status:", error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log("Usage: node check-user-status.js <email>");
  process.exit(1);
}

checkUserStatus(email)
  .then(() => {
    console.log("✅ Check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
