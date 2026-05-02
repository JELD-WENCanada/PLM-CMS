const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const { extractBusinessCardDetails } = require("../ocr");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "..", "..", "uploads") });

router.post("/business-card", upload.single("cardImage"), async (req, res) => {
  if (!req.file?.path) {
    return res.status(400).json({ error: "Image file is required" });
  }

  try {
    const parsed = await extractBusinessCardDetails(req.file.path);
    return res.json(parsed);
  } catch (error) {
    return res.status(500).json({ error: "Failed to process card image" });
  } finally {
    fs.unlink(req.file.path).catch(() => {});
  }
});

module.exports = router;
