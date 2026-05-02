const express = require("express");
const multer = require("multer");
const { extractBusinessCardDetails } = require("../ocr");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

router.post("/business-card", upload.single("cardImage"), async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: "Image file is required" });
  }

  try {
    const parsed = await extractBusinessCardDetails(req.file.buffer);
    return res.json(parsed);
  } catch (error) {
    const message = String(error?.message || "Failed to process card image");
    const isTimeout = /timed out|timeout/i.test(message);
    const isFileTooLarge = /file too large/i.test(message);
    const status = isFileTooLarge ? 413 : isTimeout ? 504 : 500;

    console.error("OCR extraction failed:", message);
    return res.status(status).json({ error: message });
  }
});

module.exports = router;
