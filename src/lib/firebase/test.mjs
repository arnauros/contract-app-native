import { initFirebase } from "./init.ts";
import { saveContract, getContract } from "./firestore.ts";

async function testFirebaseOperations() {
  console.log("Initializing Firebase...");
  initFirebase();

  // Test contract data
  const testContract = {
    userId: "test-user-id",
    title: "Test Contract",
    content: {
      projectBrief: "This is a test project brief",
      techStack: "Test tech stack",
      startDate: "2024-04-26",
      endDate: "2024-05-03",
      attachments: [
        {
          name: "test-file.pdf",
          type: "application/pdf",
          size: 1024,
          lastModified: Date.now(),
        },
      ],
    },
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    console.log("Attempting to save contract...");
    const saveResult = await saveContract(testContract);

    if (saveResult.error) {
      console.error("Failed to save contract:", saveResult.error);
      return;
    }

    const contractId = saveResult.contractId;
    if (!contractId) {
      console.error("No contract ID returned");
      return;
    }

    console.log("Contract saved successfully with ID:", contractId);

    // Try to retrieve the saved contract
    console.log("Attempting to retrieve contract...");
    const getResult = await getContract(contractId);

    if (getResult.error) {
      console.error("Failed to retrieve contract:", getResult.error);
      return;
    }

    const retrievedContract = getResult.contract;
    if (!retrievedContract) {
      console.error("No contract data returned");
      return;
    }

    console.log("Retrieved contract:", retrievedContract);

    // Verify contract data
    console.log("Verification:");
    console.log(
      "Title matches:",
      retrievedContract.title === testContract.title
    );
    console.log(
      "Content matches:",
      JSON.stringify(retrievedContract.content) ===
        JSON.stringify(testContract.content)
    );
    console.log(
      "Status matches:",
      retrievedContract.status === testContract.status
    );
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

// Run the test
testFirebaseOperations()
  .then(() => {
    console.log("Test completed");
  })
  .catch((error) => {
    console.error("Test failed:", error);
  });
