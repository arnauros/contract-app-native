"use strict";

const functions = require("firebase-functions/v2");
const express = require("express");
const cors = require("cors")({ origin: true });
const multer = require("multer");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const app = express();
app.use(cors);

const bucket = admin.storage().bucket();
const upload = multer({ memory: true });

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const file = bucket.file(`uploads/${req.file.originalname}`);
  const blobStream = file.createWriteStream();

  blobStream.on("error", (error) => {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file.");
  });

  blobStream.on("finish", () => {
    res.status(200).send("File uploaded successfully!");
  });

  blobStream.end(req.file.buffer);
});

app.post("/api/openai", async (req, res) => {
  console.log("Received request to /api/openai");
  console.log("Request body:", req.body);

  const config = {
    apiKey: process.env.OPENAI_API_KEY,
  };

  if (!config.apiKey) {
    console.error("OpenAI API key is not configured");
    return res.status(500).json({ error: "OpenAI API key is not configured" });
  }

  try {
    const promptText = req.body.prompt;
    console.log("Sending prompt to OpenAI:", promptText);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini", // or your preferred model
        messages: [{ role: "user", content: promptText }],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("OpenAI API Response:", response.data);
    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI API Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch data from OpenAI",
      details: error.response?.data || error.message,
    });
  }
});

app.post("/send-contract", async (req, res) => {
  try {
    const { contractId, editorContent } = req.body;

    if (!contractId) {
      return res.status(400).json({ error: "Contract ID is required" });
    }

    const contractRef = admin
      .firestore()
      .collection("contracts")
      .doc(contractId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      return res.status(404).json({ error: "Contract not found" });
    }

    await contractRef.update({
      editorContent: editorContent,
      status: "sent",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Here you would implement your email sending logic
    console.log(`Sending contract ${contractId} to recipient`);

    res.json({ message: "Contract sent successfully" });
  } catch (error) {
    console.error("Error sending contract:", error);
    res
      .status(500)
      .json({ error: "Failed to send contract", details: error.message });
  }
});

// User registration
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });

    res
      .status(201)
      .json({
        message: "User registered successfully",
        userId: userRecord.uid,
      });
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "Failed to register user", details: error.message });
  }
});

// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Firebase Admin SDK does not support password authentication directly.
    // You need to use Firebase Client SDK on the client-side to sign in users.
    // Here, you can verify the ID token sent from the client after successful login.

    const idToken = req.body.idToken; // Assume the client sends the ID token after login
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    res.json({
      message: "User logged in successfully",
      userId: decodedToken.uid,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res
      .status(500)
      .json({ error: "Failed to log in user", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.send(
    "Welcome to the Contract App. Use /api/openai to interact with the AI."
  );
});

app.use((req, res) => {
  console.log(`Received request for ${req.method} ${req.url}`);
  res.status(404).send("Not Found");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});

exports.app = functions.https.onRequest(
  {
    invoker: "public", // This allows unauthenticated access
    memory: "512MiB",
    region: "us-central1", // Specify your desired region
    timeoutSeconds: 300,
  },
  app
);
