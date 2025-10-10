const ContentImage = require("../models/ContentImage");
const fs = require("fs");
const path = require("path");

// @desc Upload content image
// @route POST /api/content-images/upload
// @access Private (Admin only)
const uploadContentImage = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Image name is required" });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    
    const contentImage = await ContentImage.create({
      name: name.trim(),
      imageUrl,
      filename: req.file.filename,
      uploadedBy: req.user.id
    });

    res.status(201).json(contentImage);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Get all content images
// @route GET /api/content-images
// @access Private (Admin only)
const getContentImages = async (req, res) => {
  try {
    const images = await ContentImage.find({ uploadedBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email");
    
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Update content image name
// @route PUT /api/content-images/:id
// @access Private (Admin only)
const updateContentImage = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Image name is required" });
    }

    const image = await ContentImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    if (image.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    image.name = name.trim();
    await image.save();

    res.json(image);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Delete content image
// @route DELETE /api/content-images/:id
// @access Private (Admin only)
const deleteContentImage = async (req, res) => {
  try {
    const image = await ContentImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    if (image.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete file from uploads folder
    const filePath = path.join(__dirname, "../uploads", image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await ContentImage.findByIdAndDelete(req.params.id);

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  uploadContentImage,
  getContentImages,
  updateContentImage,
  deleteContentImage
};