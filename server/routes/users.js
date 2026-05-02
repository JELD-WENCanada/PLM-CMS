const express = require("express");
const {
  authenticateUser,
  listUsers,
  resetUserPassword,
  updateUser,
} = require("../storage");

const router = express.Router();

router.get("/", async (_req, res) => {
  const users = await listUsers();
  res.json({ users });
});

router.put("/:id", async (req, res) => {
  const updated = await updateUser(req.params.id, req.body || {});
  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user: updated });
});

router.post("/:id/auth", async (req, res) => {
  try {
    const result = await authenticateUser(req.params.id, req.body?.password);
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/:id/reset-password", async (req, res) => {
  try {
    const updated = await resetUserPassword(
      req.params.id,
      req.body?.currentPassword,
      req.body?.newPassword
    );
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user: updated, success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
