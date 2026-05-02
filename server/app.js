const path = require("path");
const express = require("express");
const cors = require("cors");

const contactsRouter = require("./routes/contacts");
const ocrRouter = require("./routes/ocr");
const usersRouter = require("./routes/users");

const app = express();

function mountApiRoutes(prefix = "") {
  app.use(`${prefix}/contacts`, contactsRouter);
  app.use(`${prefix}/ocr`, ocrRouter);
  app.use(`${prefix}/users`, usersRouter);
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

mountApiRoutes("/api");
mountApiRoutes("");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

module.exports = app;