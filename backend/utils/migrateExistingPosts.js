const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const { getAssociatedImages } = require('./imageUtils');

// Migration script to update existing posts with associatedImages - with error handling
const migrateExistingPosts = async () => {
    try {
        console.log('Starting migration of existing posts...');
        
        const posts = await BlogPost.find({ 
            $or: [
                { associatedImages: { $exists: false } },
                { associatedImages: { $size: 0 } }
            ]
        });
        
        console.log(`Found ${posts.length} posts to migrate`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const post of posts) {
            try {
                const associatedImages = getAssociatedImages(post.coverImageUrl, post.content);
                await BlogPost.findByIdAndUpdate(post._id, { associatedImages });
                console.log(`✓ Updated post: ${post.title} (${associatedImages.length} images)`);
                successCount++;
            } catch (error) {
                const errorMsg = `✗ Failed to update post "${post.title}": ${error.message}`;
                console.error(errorMsg);
                errors.push(errorMsg);
                errorCount++;
            }
        }
        
        console.log('\n=== Migration Summary ===');
        console.log(`Successfully migrated: ${successCount} posts`);
        console.log(`Failed migrations: ${errorCount} posts`);
        
        if (errors.length > 0) {
            console.log('\nErrors encountered:');
            errors.forEach(error => console.log(error));
        }
        
        console.log('Migration completed!');
        
        return {
            success: errorCount === 0,
            totalPosts: posts.length,
            successCount,
            errorCount,
            errors
        };
        
    } catch (error) {
        console.error('Migration failed with critical error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Function to run migration safely
const runMigration = async () => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database not connected. Please ensure MongoDB is running and connected.');
        }
        
        const result = await migrateExistingPosts();
        
        if (result.success) {
            console.log('🎉 Migration completed successfully!');
        } else {
            console.log('⚠️ Migration completed with errors. Check logs above.');
        }
        
        return result;
    } catch (error) {
        console.error('Failed to run migration:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { 
    migrateExistingPosts,
    runMigration 
};