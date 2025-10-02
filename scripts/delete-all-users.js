/**
 * Script to delete all user accounts from the database
 * Run this in the browser console while logged in to your app
 */

// Copy and paste this entire script into your browser console while on your app

async function deleteAllUsers() {
  try {
    console.log("🔐 Getting Firebase instance...");

    // Get Firebase instance
    const { getAuth } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    const { getFirestore, collection, getDocs, deleteDoc, doc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    const auth = getAuth();
    const db = getFirestore();

    console.log("📋 Getting all user documents...");

    // Get all user documents
    const usersCollection = collection(db, "users");
    const userDocs = await getDocs(usersCollection);

    console.log(`Found ${userDocs.size} user documents`);

    if (userDocs.size === 0) {
      console.log("✅ No user documents found to delete");
      return;
    }

    // Show confirmation
    const confirmDelete = confirm(
      `Are you sure you want to delete ALL ${userDocs.size} user accounts?\n\nThis action cannot be undone!`
    );

    if (!confirmDelete) {
      console.log("❌ Deletion cancelled by user");
      return;
    }

    console.log("🗑️ Deleting all user documents...");

    // Delete all user documents
    const deletePromises = [];
    userDocs.forEach((userDoc) => {
      console.log(`Deleting user: ${userDoc.id}`);
      deletePromises.push(deleteDoc(doc(db, "users", userDoc.id)));
    });

    await Promise.all(deletePromises);

    console.log(`✅ Successfully deleted ${userDocs.size} user documents`);

    // Also delete any contracts
    console.log("📋 Checking for contracts to delete...");
    const contractsCollection = collection(db, "contracts");
    const contractDocs = await getDocs(contractsCollection);

    if (contractDocs.size > 0) {
      console.log(`Found ${contractDocs.size} contract documents`);
      const contractDeletePromises = [];
      contractDocs.forEach((contractDoc) => {
        console.log(`Deleting contract: ${contractDoc.id}`);
        contractDeletePromises.push(
          deleteDoc(doc(db, "contracts", contractDoc.id))
        );
      });

      await Promise.all(contractDeletePromises);
      console.log(
        `✅ Successfully deleted ${contractDocs.size} contract documents`
      );
    } else {
      console.log("✅ No contract documents found to delete");
    }

    // Also delete any invoices
    console.log("📋 Checking for invoices to delete...");
    const invoicesCollection = collection(db, "invoices");
    const invoiceDocs = await getDocs(invoicesCollection);

    if (invoiceDocs.size > 0) {
      console.log(`Found ${invoiceDocs.size} invoice documents`);
      const invoiceDeletePromises = [];
      invoiceDocs.forEach((invoiceDoc) => {
        console.log(`Deleting invoice: ${invoiceDoc.id}`);
        invoiceDeletePromises.push(
          deleteDoc(doc(db, "invoices", invoiceDoc.id))
        );
      });

      await Promise.all(invoiceDeletePromises);
      console.log(
        `✅ Successfully deleted ${invoiceDocs.size} invoice documents`
      );
    } else {
      console.log("✅ No invoice documents found to delete");
    }

    // Sign out current user
    if (auth.currentUser) {
      console.log("👋 Signing out current user...");
      await auth.signOut();
      console.log("✅ User signed out");
    }

    console.log("🎉 Database cleanup complete!");
    console.log("🔄 Redirecting to signup page...");

    // Redirect to signup page
    setTimeout(() => {
      window.location.href = "/signup";
    }, 2000);
  } catch (error) {
    console.error("❌ Error:", error.message);
    alert("Error deleting users: " + error.message);
  }
}

// Run the function
console.log("🚀 Starting database cleanup...");
deleteAllUsers();
