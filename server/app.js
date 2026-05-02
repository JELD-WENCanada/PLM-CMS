const path = require("path");
const express = require("express");
const cors = require("cors");

const contactsRouter = require("./routes/contacts");
const ocrRouter = require("./routes/ocr");
const usersRouter = require("./routes/users");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/contacts", contactsRouter);
app.use("/api/ocr", ocrRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

module.exports = app;