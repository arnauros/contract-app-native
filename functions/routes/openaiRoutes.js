const express = require("express");
const router = express.Router();
const { getOpenAIResponse } = require("../controllers/openaiController");

// This line is optional, useful for debugging
// console.log("getOpenAIResponse:", getOpenAIResponse);

router.post("/", getOpenAIResponse);

module.exports = router;
