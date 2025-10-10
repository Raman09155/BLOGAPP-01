const express = require("express");
const {
  uploadContentImage,
  getContentImages,
  updateContentImage,
  deleteContentImage
} = require("../controllers/contentImageController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Content Image routes
router.post("/upload", protect, upload.single("image"), uploadContentImage);
router.get("/", protect, getContentImages);
router.put("/:id", protect, updateContentImage);
router.delete("/:id", protect, deleteContentImage);

module.exports = router;