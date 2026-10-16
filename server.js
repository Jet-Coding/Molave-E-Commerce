require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & Cookie Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

const { verifyToken, requireRole } = require("./middleware/auth");
const clientRoutes = require("./routes/clientRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");

// Mount Auth Module
app.use("/", clientRoutes);
app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);

// Catch-all 404
app.use((req, res) => {
	res.status(404).send("Page Not Found");
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));