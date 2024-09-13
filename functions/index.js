"use strict";

require("dotenv").config();
const functions = require("firebase-functions/v2");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const admin = require("firebase-admin");
const path = require("path");
const axios = require("axios");

admin.initializeApp();

const app = express();

// Apply less restrictive CORS to all routes
app.use(cors({ origin: true }));
app.use(express.json());

// Handle preflight requests for all routes
app.options("*", cors());

const bucket = admin.storage().bucket();
const upload = multer({ dest: path.join(__dirname, "uploads/") });

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No file uploaded.");
  }

  const destination = `uploads/${file.originalname}`;
  bucket
    .upload(file.path, { destination: destination })
    .then(() => res.send("File uploaded successfully!"))
    .catch((error) => {
      console.error("Error uploading file:", error);
      res.status(500).send("Error uploading file.");
    });
});

const openaiApiKey = functions.config().openai.api_key;

// OpenAI proxy route
app.get("/proxy", async (req, res) => {
  try {
    const response = await axios.get("https://api.openai.com/v1/assistants", {
      headers: { Authorization: `Bearer ${openaiApiKey}` },
    });
    res.json(response.data);
  } catch (error) {
    console.error(
      "OpenAI API Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: "Failed to fetch data from OpenAI",
      details: error.response ? error.response.data : error.message,
    });
  }
});

const openaiRoutes = require("./routes/openaiRoutes");
const contractController = require("./controllers/contractController");

// Apply the routes to the app
app.use(
  "/api/openai",
  (req, res, next) => {
    console.log("OpenAI route accessed");
    next();
  },
  openaiRoutes
);

// Contract route
app.post("/send-contract", contractController.sendContract);

// Home route
app.get("/", (req, res) => {
  res.send(
    "Welcome to the Contract App. Use /api/openai to interact with the AI."
  );
});

// 404 handler
app.use((req, res) => {
  console.log(`Received request for ${req.method} ${req.url}`);
  res.status(404).send("Not Found");
});

exports.app = functions.https.onRequest(app);
