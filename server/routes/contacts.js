const express = require("express");
const {
  addTimelineEntry,
  createContact,
  deleteContact,
  getContactById,
  listContacts,
  updateContact,
} = require("../storage");

const router = express.Router();

router.get("/", async (req, res) => {
  const contacts = await listContacts(String(req.query.search || ""));
  res.json({ contacts });
});

router.get("/:id", async (req, res) => {
  const contact = await getContactById(req.params.id);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }
  return res.json({ contact });
});

router.post("/", async (req, res) => {
  try {
    const created = await createContact(req.body || {}, req.body?.actorId);
    return res.status(201).json({ contact: created });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await updateContact(req.params.id, req.body || {}, req.body?.actorId);
    if (!updated) {
      return res.status(404).json({ error: "Contact not found" });
    }
    return res.json({ contact: updated });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteContact(req.params.id, req.body?.actorId);
    if (!deleted) {
      return res.status(404).json({ error: "Contact not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/:id/notes", async (req, res) => {
  try {
    const entry = await addTimelineEntry(req.params.id, req.body?.text, req.body?.actorId, "note");
    if (!entry) {
      return res.status(404).json({ error: "Contact not found" });
    }
    return res.status(201).json({ entry });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
