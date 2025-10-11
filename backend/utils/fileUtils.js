const fs = require('fs');
const path = require('path');

// Delete physical files from uploads directory with comprehensive error handling
const deleteFiles = async (filenames) => {
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
        return { success: true, deletedFiles: [], errors: [] };
    }
    
    const uploadsDir = path.join(__dirname, '../uploads');
    const deletedFiles = [];
    const errors = [];
    
    // Validate uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
        console.error('Uploads directory does not exist:', uploadsDir);
        return { success: false, deletedFiles: [], errors: ['Uploads directory not found'] };
    }
    
    for (const filename of filenames) {
        try {
            // Validate filename
            if (!filename || typeof filename !== 'string') {
                errors.push(`Invalid filename: ${filename}`);
                continue;
            }
            
            // Prevent directory traversal attacks
            const sanitizedFilename = path.basename(filename);
            if (sanitizedFilename !== filename) {
                errors.push(`Invalid filename format: ${filename}`);
                continue;
            }
            
            const filePath = path.join(uploadsDir, sanitizedFilename);
            
            // Check if file exists before attempting deletion
            if (fs.existsSync(filePath)) {
                // Additional security check - ensure file is within uploads directory
                const resolvedPath = path.resolve(filePath);
                const resolvedUploadsDir = path.resolve(uploadsDir);
                
                if (!resolvedPath.startsWith(resolvedUploadsDir)) {
                    errors.push(`Security violation: File outside uploads directory: ${filename}`);
                    continue;
                }
                
                fs.unlinkSync(filePath);
                deletedFiles.push(filename);
                console.log(`Successfully deleted file: ${filename}`);
            } else {
                console.log(`File not found (already deleted?): ${filename}`);
                // Don't treat this as an error since the goal is achieved
            }
        } catch (error) {
            const errorMsg = `Error deleting file ${filename}: ${error.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
        }
    }
    
    return {
        success: errors.length === 0,
        deletedFiles,
        errors,
        summary: `Deleted ${deletedFiles.length} files, ${errors.length} errors`
    };
};

module.exports = {
    deleteFiles
};