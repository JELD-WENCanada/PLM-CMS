const Tesseract = require("tesseract.js");

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

async function extractBusinessCardDetails(imagePath) {
  const result = await Tesseract.recognize(imagePath, "eng", {
    logger: () => {},
  });

  return parseBusinessCardText(result?.data?.text || "");
}

module.exports = {
  extractBusinessCardDetails,
};
