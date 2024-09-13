const admin = require("firebase-admin");

exports.sendContract = async (req, res) => {
  const {contractId} = req.body;

  if (!contractId) {
    return res.status(400).json({error: "Contract ID is required"});
  }

  try {
    const contractRef = admin
        .firestore()
        .collection("contracts")
        .doc(contractId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      return res.status(404).json({error: "Contract not found"});
    }

    const contractData = contractDoc.data();

    // Implement your email sending logic here
    // For example, using nodemailer or a transactional email service
    console.log(`Sending contract ${contractId} to recipient`);
    console.log(`Contract details: ${JSON.stringify(contractData)}`);
    // You might use contractData here, e.g.:
    // console.log(`Contract details: ${JSON.stringify(contractData)}`);

    // Update the contract status in Firestore
    await contractRef.update({status: "sent"});

    res.json({message: "Contract sent successfully"});
  } catch (error) {
    console.error("Error sending contract:", error);
    res
        .status(500)
        .json({error: "Failed to send contract", details: error.message});
  }
};
