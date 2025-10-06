const jwt = require("jsonwebtoken");
const User = require("../models/user");

//Middleware to protect routes
const protect = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (token && token.startsWith("Bearer")){
            token = token.split(" ")[1]; // Extract token 
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            //next();  change by amazone q
            if (!req.user) {
                return res.status(401).json({ message: "User not found" });
            }
            
            next();
        } else {
            res.status(401).json({ message: "Not authorized, no token" });
        }
    } catch (error) {
        res.status(401).json({ message: "Token failed", error: error.message });
    }
};


// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        let token = req.headers.authorization;
        
        if (token && token.startsWith("Bearer")) {
            token = token.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
        }
        
        next(); // Continue regardless of auth status
    } catch (error) {
        // Ignore auth errors, continue without user
        next();
    }
};

module.exports = { protect, optionalAuth };