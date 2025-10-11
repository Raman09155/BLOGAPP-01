const path = require('path');

// Extract filename from image URL with error handling
const extractFilenameFromUrl = (url) => {
    try {
        if (!url || typeof url !== 'string') return null;
        const filename = url.split('/').pop();
        return filename && filename.includes('.') ? filename : null;
    } catch (error) {
        console.error('Error extracting filename from URL:', error);
        return null;
    }
};

// Extract all image URLs from markdown/HTML content with error handling
const extractImagesFromContent = (content) => {
    try {
        if (!content || typeof content !== 'string') return [];
        
        const imageUrls = [];
        
        // Regex patterns for different image formats
        const patterns = [
            /!\[.*?\]\((.*?)\)/g, // Markdown: ![alt](url)
            /<img[^>]+src=["']([^"']+)["'][^>]*>/gi, // HTML: <img src="url">
            /src=["']([^"']+)["']/gi // General src attributes
        ];
        
        patterns.forEach(pattern => {
            try {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const url = match[1];
                    if (url && url.includes('localhost:8000')) {
                        imageUrls.push(url);
                    }
                }
            } catch (patternError) {
                console.error('Error processing pattern:', patternError);
            }
        });
        
        return imageUrls;
    } catch (error) {
        console.error('Error extracting images from content:', error);
        return [];
    }
};

// Get all associated image filenames for a post with error handling
const getAssociatedImages = (coverImageUrl, content) => {
    try {
        const filenames = [];
        
        // Add cover image filename
        const coverFilename = extractFilenameFromUrl(coverImageUrl);
        if (coverFilename) {
            filenames.push(coverFilename);
        }
        
        // Add content image filenames
        const contentUrls = extractImagesFromContent(content);
        contentUrls.forEach(url => {
            const filename = extractFilenameFromUrl(url);
            if (filename && !filenames.includes(filename)) {
                filenames.push(filename);
            }
        });
        
        return filenames;
    } catch (error) {
        console.error('Error getting associated images:', error);
        return [];
    }
};

// Check if images are used in other posts (reference counting)
const getUnusedImages = async (imagesToCheck, excludePostId, BlogPost) => {
    try {
        if (!imagesToCheck || imagesToCheck.length === 0) {
            return [];
        }
        
        const unusedImages = [];
        
        for (const filename of imagesToCheck) {
            try {
                // Check if this image is used in any other post
                const otherPostsUsingImage = await BlogPost.find({
                    _id: { $ne: excludePostId }, // Exclude current post being deleted
                    associatedImages: filename
                });
                
                // If no other posts use this image, it's safe to delete
                if (otherPostsUsingImage.length === 0) {
                    unusedImages.push(filename);
                    console.log(`Image ${filename} is not used in any other post - safe to delete`);
                } else {
                    console.log(`Image ${filename} is used in ${otherPostsUsingImage.length} other post(s) - keeping it`);
                }
            } catch (imageCheckError) {
                console.error(`Error checking usage for image ${filename}:`, imageCheckError);
                // If we can't verify, don't delete (safer approach)
            }
        }
        
        return unusedImages;
    } catch (error) {
        console.error('Error checking unused images:', error);
        return [];
    }
};

module.exports = {
    extractFilenameFromUrl,
    extractImagesFromContent,
    getAssociatedImages,
    getUnusedImages
};