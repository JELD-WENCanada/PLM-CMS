const Tesseract = require("tesseract.js");

const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 25000);
let workerPromise = null;
let ocrQueue = Promise.resolve();

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: () => {},
      });

      await worker.setParameters({
        // Single uniform text block is usually faster for business-card style OCR.
        tessedit_pageseg_mode: "6",
      });

      return worker;
    })();
  }

  return workerPromise;
}

async function runOcr(imageInput) {
  const worker = await getWorker();
  return worker.recognize(imageInput);
}

function runOcrQueued(imageInput) {
  const job = ocrQueue.then(() => runOcr(imageInput));
  ocrQueue = job.catch(() => {});
  return job;
}

function findFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function guessName(lines) {
  const candidates = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^[A-Za-z][A-Za-z .'-]{2,}$/.test(line));

  return candidates[0] || "";
}

function guessCompany(lines) {
  const companyKeywords = [
    "inc",
    "llc",
    "ltd",
    "group",
    "solutions",
    "technologies",
    "consulting",
    "studio",
    "labs",
  ];

  const found = lines.find((line) => {
    const lowered = line.toLowerCase();
    return companyKeywords.some((key) => lowered.includes(key));
  });

  return found || "";
}

function parseBusinessCardText(rawText) {
  const text = (rawText || "").replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const email = findFirstMatch(text, [
    /([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/,
  ]);

  const website = findFirstMatch(text, [
    /(https?:\/\/[^\s]+)/i,
    /((?:www\.)?[^\s]+\.[A-Za-z]{2,})(?!@)/i,
  ]);

  const phone = findFirstMatch(text, [
    /(\+?\d[\d\s().-]{7,}\d)/,
  ]);

  const linkedIn = findFirstMatch(text, [
    /(https?:\/\/www\.linkedin\.com\/[^\s]+)/i,
    /(linkedin\.com\/[^\s]+)/i,
  ]);

  const name = guessName(lines);
  const company = guessCompany(lines);

  return {
    rawText: text,
    fields: {
      name,
      company,
      title: "",
      email,
      phone,
      website,
      linkedIn,
    },
  };
}

async function extractBusinessCardDetails(imageInput) {
  const result = await withTimeout(
    runOcrQueued(imageInput),
    OCR_TIMEOUT_MS,
    "OCR timed out. Try a tighter crop focused on text."
  );

  return parseBusinessCardText(result?.data?.text || "");
}

module.exports = {
  extractBusinessCardDetails,
};
