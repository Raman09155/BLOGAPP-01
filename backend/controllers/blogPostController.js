const BlogPost = require("../models/BlogPost");
const Comment = require("../models/Comment");
const ContentImage = require("../models/ContentImage");
const mongoose = require("mongoose");
const { getAssociatedImages, getUnusedImages } = require('../utils/imageUtils');
const { deleteFiles } = require('../utils/fileUtils');

// @desc Create a New blog post
// @route POST /api/posts
// @access private (Admin only)
const createPost = async (req, res) => {
    try {
        const { title, content, coverImageUrl, tags, isDraft, generatedByAI, metaTitle, metaDescription, metaKeywords, customUrl, imageAltText, canonicalUrl } =
            req.body;

            // Use custom URL if provided, otherwise generate from title
            const slug = customUrl || title
             .toLowerCase()
             .replace(/ /g, "_")
             .replace(/[^\w-]+/g, "");
            
            // Get associated images for tracking with error handling
            let associatedImages = [];
            try {
                associatedImages = getAssociatedImages(coverImageUrl, content);
            } catch (imageError) {
                console.error('Error tracking images for new post:', imageError);
                // Continue without image tracking rather than failing the post creation
            }
            
            const newPost = new BlogPost({
                title,
                slug,
                content,
                coverImageUrl,
                tags,
                author: req.user._id,
                isDraft,
                generatedByAI,
                metaTitle: metaTitle || "",
                metaDescription: metaDescription || "",
                metaKeywords: metaKeywords || "",
                customUrl: customUrl || "",
                imageAltText: imageAltText || "",
                canonicalUrl: canonicalUrl || "",
                associatedImages,
            });
            await newPost.save();
            res.status(201).json(newPost);
    } catch (err) {
        res 
           .status(500)
           .json({ message: "Failed to create post", error: err.message });
    }
};

// @desc Update an existing blog post
// @route PUT /api/posts/:id
// @access Private (Author or Admin)
const updatePost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found"});

        if (
            post.author.toString() !== req.user._id.toString() &&
            !req.user.isAdmin
        ) {
            return res
            .status(403)
            .json({ message: "Not authorized to update this post" });
        }

        const updatedData = req.body;
        if (updatedData.title) {
            // Use custom URL if provided, otherwise generate from title
            updatedData.slug = updatedData.customUrl || updatedData.title
            .toLowerCase()
            .replace(/ /g, "_")
            .replace(/[^\w-]+/g, "");
        }
        
        // Update associated images if content or cover image changed with error handling
        if (updatedData.content || updatedData.coverImageUrl) {
            try {
                const coverImageUrl = updatedData.coverImageUrl || post.coverImageUrl;
                const content = updatedData.content || post.content;
                updatedData.associatedImages = getAssociatedImages(coverImageUrl, content);
            } catch (imageError) {
                console.error('Error updating associated images:', imageError);
                // Continue with update without modifying associatedImages
            }
        }
        
        const updatedPost = await BlogPost.findByIdAndUpdate(
            req.params.id,
            updatedData,
            { new: true }
        );
        res.json(updatedPost);

    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

// @desc Delete a blog post
// @route DELETE /api/posts/:id
// @access Private (Author or Admin)
const deletePost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Delete associated comments with error handling
        let commentsDeleted = 0;
        try {
            const deleteCommentsResult = await Comment.deleteMany({ post: req.params.id });
            commentsDeleted = deleteCommentsResult.deletedCount || 0;
            console.log(`Deleted ${commentsDeleted} comments for post: ${post.title}`);
        } catch (commentError) {
            console.error('Error deleting comments:', commentError);
            // Continue with post deletion even if comment deletion fails
        }

        // Check which images are safe to delete (not used in other posts)
        let unusedImages = [];
        let contentImagesDeleted = 0;
        let fileDeleteResult = { success: true, errors: [] };
        
        if (post.associatedImages && post.associatedImages.length > 0) {
            try {
                // Get images that are not used in any other post
                unusedImages = await getUnusedImages(post.associatedImages, post._id, BlogPost);
                console.log(`Found ${unusedImages.length} unused images out of ${post.associatedImages.length} total images`);
                
                // Delete ContentImage database entries only for unused images
                if (unusedImages.length > 0) {
                    try {
                        const deleteContentImagesResult = await ContentImage.deleteMany({ 
                            filename: { $in: unusedImages } 
                        });
                        contentImagesDeleted = deleteContentImagesResult.deletedCount || 0;
                        console.log(`Deleted ${contentImagesDeleted} ContentImage entries for unused images`);
                    } catch (contentImageError) {
                        console.error('Error deleting ContentImage entries:', contentImageError);
                    }
                }
                
                // Delete physical files only for unused images
                if (unusedImages.length > 0) {
                    try {
                        fileDeleteResult = await deleteFiles(unusedImages);
                        
                        if (!fileDeleteResult.success) {
                            console.error('Some unused files could not be deleted:', fileDeleteResult.errors);
                        }
                    } catch (fileError) {
                        console.error('Error during unused file cleanup:', fileError);
                    }
                }
                
            } catch (imageCheckError) {
                console.error('Error checking image usage:', imageCheckError);
                // If we can't check usage, don't delete any images (safer approach)
            }
        }

        // Delete the post from database
        await post.deleteOne();
        
        // Prepare response with cleanup information
        const response = { message: "Post deleted" };
        if (commentsDeleted > 0) {
            response.commentsDeleted = commentsDeleted;
        }
        if (post.associatedImages && post.associatedImages.length > 0) {
            response.totalImages = post.associatedImages.length;
            response.imagesKept = post.associatedImages.length - unusedImages.length;
        }
        if (contentImagesDeleted > 0) {
            response.contentImagesDeleted = contentImagesDeleted;
        }
        if (fileDeleteResult.deletedFiles && fileDeleteResult.deletedFiles.length > 0) {
            response.filesDeleted = fileDeleteResult.deletedFiles.length;
        }
        if (fileDeleteResult.errors && fileDeleteResult.errors.length > 0) {
            response.fileCleanupWarnings = fileDeleteResult.errors.length;
        }
        
        res.json(response);

    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

// @desc Get blog posts by status (all, published, or draft) and include counts 
// @route GET /api/posts?status=published |draft|all&page=1
// @access Public
const getAllPosts = async (req, res) => {
    try {
        const status = req.query.status || "published";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        //Determine filter for main post response
        let filter = {};
        if (status === "published") filter.isDraft = false;
        else if (status === "draft") filter.isDraft = true;

        //Fetch paginated posts
        const posts = await BlogPost.find(filter)
           .populate("author", "name profileImageUrl")
           .sort({ updatedAt: -1 })
           .skip(skip)
           .limit(limit);

           //Count totals for pagination and tab count 
           const [totalCount, allCount, publishedCount, draftCount] = await Promise.all([
            BlogPost.countDocuments(filter), // for pagination of current tab
            BlogPost.countDocuments(),
            BlogPost.countDocuments({
                isDraft: false}),
            BlogPost.countDocuments({ isDraft: true }),
           ]);

           res.json({
            posts,
            page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            counts: {
                all: allCount,
                published: publishedCount,
                draft: draftCount,
            },
           });
           
    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

// @desc Get a single blog post by slug
// @route GET /api/posts/:slug
// @access Public
const getPostBySlug = async (req, res) => {
    try {
        const post = await BlogPost.findOne({ slug: req.params.slug }).populate(
            "author",
            "name profileImageUrl"
        );
        if (!post) return res.status(404).json({ message: "Post not found" });
        
        // Add user like status if authenticated
        let likedByCurrentUser = false;
        if (req.user?._id) {
            likedByCurrentUser = post.likedBy.includes(req.user._id);
        }
        
        const postData = post.toObject();
        delete postData.likedBy; // Don't expose user IDs
        
        res.json({
            ...postData,
            likedByCurrentUser
        });
    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

// @desc Get blog posts by tag
// @route GET /api/posts/tag/:tag
// @access Public
const getPostsByTag = async (req, res) => {
    try {
        const posts = await BlogPost.find({
            tags: req.params.tag,
            isDraft: false,
        }).populate("author", "name profileImageUrl");
        res.json(posts);
    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

// @desc Search posts by title or content
// @route GET /api/posts/search?q=keyword
// @access Public
const searchPosts = async (req, res) => {
    try {
        const q = req.query.q;
        const posts = await BlogPost.find({
            isDraft: false,
            $or: [
                { title: { $regex: q, $options: "i" } },
                { content: { $regex: q, $options: "i" } },
            ],
        }).populate("author", "name profileImageUrl");
        res.json(posts);
    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

// @desc Increment post view count
// @route PUT /api/posts/:id/view
// @access Public
const incrementView = async (req, res) => {
    try {
        await BlogPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ message: "View count incremented" });
    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

// @desc Like/Unlike a post
// @route PUT /api/posts/:id/like
// @access Private
const likePost = async (req, res) => {
    try {
        const userId = req.user?._id;
        const postId = req.params.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required" 
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid post ID" 
            });
        }
        
        const post = await BlogPost.findById(postId);
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: "Post not found" 
            });
        }
        
        const hasLiked = post.likedBy.includes(userId);
        let updatedPost;
        
        if (hasLiked) {
            // Unlike the post
            updatedPost = await BlogPost.findByIdAndUpdate(
                postId,
                {
                    $inc: { likes: -1 },
                    $pull: { likedBy: userId }
                },
                { new: true }
            );
            
            res.json({ 
                success: true, 
                message: "Post unliked successfully",
                likes: updatedPost.likes,
                isLiked: false
            });
        } else {
            // Like the post
            updatedPost = await BlogPost.findByIdAndUpdate(
                postId,
                {
                    $inc: { likes: 1 },
                    $addToSet: { likedBy: userId }
                },
                { new: true }
            );
            
            res.json({ 
                success: true, 
                message: "Post liked successfully",
                likes: updatedPost.likes,
                isLiked: true
            });
        }
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: err.message 
        });
    }
};

// @desc Get top trending posts
// @route GET /api/posts/trending
// @access Private
const getTopPosts = async (req, res) => {
    try {
        //Top performing posts 
        const posts = await BlogPost.find({ isDraft: false })
        .sort({ views: -1, likes: -1 })
        .limit(5);

        res.json(posts);
    } catch (err) {
        res 
           .status(500)
           .json({ message: "Server Error", error: err.message });
    }
};

module.exports = {
    createPost,
    updatePost,
    deletePost,
    getAllPosts,
    getPostBySlug,
    getPostsByTag,
    searchPosts,
    incrementView,
    likePost,
    getTopPosts,
};