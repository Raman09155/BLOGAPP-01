require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const blogPostRoutes = require("./routes/blogPostRoutes");
const commentRoutes = require("./routes/commentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const aiRoutes = require("./routes/aiRoutes"); 

const app = express();

//Middleware to handle CORS

app.use(
    cors({
        origin: process.env.NODE_ENV === 'production'
        ? "https://airconnect-blog-app.onrender.com"
        :"http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);


//Connect Database
connectDB();

//Middleware 
app.use(express.json());

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", blogPostRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/dashboard-summary", dashboardRoutes);

app.use("/api/ai", aiRoutes);

//Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {}));

//start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));