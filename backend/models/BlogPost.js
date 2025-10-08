const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        slug: {type: String, required: true, unique: true },
        content: { type: String, required: true }, //markdown
        coverImageUrl: { type: String, default: null },
        tags: [{ type: String }],
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        isDraft: { type: Boolean, default: false },
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        generatedByAI: { type: Boolean, default: false },
        
        // Meta Data Fields for SEO
        metaTitle: { type: String, default: "" },
        metaDescription: { type: String, default: "" },
        metaKeywords: { type: String, default: "" },
        customUrl: { type: String, default: "" }, // Custom URL slug
        imageAltText: { type: String, default: "" }, // Alt text for cover image
        canonicalUrl: { type: String, default: "" }, // Canonical URL
    },
    { timestamps: true }
);

module.exports = mongoose.model("BlogPost", BlogPostSchema);