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
    return res.status(500).json({ error: "Failed to process card image" });
  }
});

module.exports = router;
