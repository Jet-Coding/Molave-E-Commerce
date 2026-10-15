const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

// GET ROUTES (Render Views)
router.get("/login", (req, res) => {
	if (req.cookies?.client_token) {
        return res.redirect("/"); 
	}
    res.render("client/login", { title: "Login", error: null });
});

router.get("/register", (req, res) => {
	if (req.cookies?.client_token) {
        return res.redirect("/"); 
	}
    res.render("client/register", { title: "Register", error: null });
});

router.get("/login-admin", (req, res) => {
	if (req.cookies?.admin_token) {
		return res.redirect("/admin/dashboard")
	}
	res.render("admin/login-admin", { title: "Admin Login", error: null });
});

// POST ROUTES (Database Operations)
// POST /auth/login - Authenticate User
router.post("/login", async (req, res) => {
	try {
		const { identifier, email, username, password } = req.body;
		const inputVal = identifier || email || username;
		if (!inputVal || !password) {
			return res.status(400).render("client/login", {
				title: "SynDol Login",
				error: ["All fields are required."],
			});
		}
		const user = db
			.prepare(
				"SELECT id, username, email, password, role FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
			)
			.get(inputVal, inputVal);

		if (!user) {
			return res.status(401).render("client/login", {
				title: "SynDol Login",
				error: ["Invalid user credentials."],
				});
		}
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).render("client/login", {
				title: "SynDol Login",
				errors: ["Invalid user credentials."],
			})
		}
        const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role },
            process.env.JWT_SECRET || "fallback-secret", { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
        );
        res.cookie("client_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000
        });
        // Absolute path redirect based on user role
        return res.redirect("/");
    } catch (error) {
        console.error("User Login error:", error);
        return res.status(500).render("client/login", {
            title: "SynDol Login",
            error: ["An error occurred during login."]
        });
    }
});

// POST /auth/register - Direct SQLite database insertion
router.post("/register", async (req, res) => {
	const { username, email, password } = req.body;
	// Basic validation
	if (!username || !email || !password) {
		return res.status(400).render("client/register", {
			title: "SynDol Register",
			error: ["All fields are required."]
		});
	}
	try {
		// Check if username or email already exists in SQLite
		const checkStmt = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?");
		const existingUser = checkStmt.get(username, email);
		// authRoutes.js
		if (existingUser) {
			return res.status(400).render("client/register", {
				title: "SynDol Register",
				error: "Username or email is already taken."
			});
		}
		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);
		// Directly insert user into SQLite database
		const insertStmt = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
		const result = insertStmt.run(username, email, hashedPassword);
		// Generate JWT token using the newly inserted row ID
		const token = jwt.sign({ id: result.lastInsertRowid, username: username, email: email, role: "user"},
			process.env.JWT_SECRET || "fallback-secret-key", { expiresIn: "1d" }
		);
		// Set HTTP-only Cookie
		res.cookie("client_token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 24 * 60 * 60 * 1000 // 24 hours
		});
		// Redirect to chat workspace dashboard
		return res.redirect("/");
	} catch (error) {
		console.error("Database Registration Error:", error);
		return res.status(500).render("client/register", {
			title: "SynDol Register",
			error: "A database error occurred while creating your account."
		});
	}
});

// POST /auth/login-admin
router.post("/login-admin", async (req, res) => {
	try {
		const { identifier, email, username, password } = req.body;
		const inputVal = identifier || email || username;
		if (!inputVal || !password) {
			return res.status(400).render("admin/login-admin", {
				title: "SynDol Admin Login",
				errors: ["All fields are required."],
			});
		}
		const admin = db
			.prepare(
				"SELECT id, username, email, password FROM admin WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
			)
			.get(inputVal, inputVal);
		if (!admin) {
			return res.status(400).render("admin/login-admin", {
				title: "SynDol Admin Login",
				errors: ["Invalid admin credentials."],
			});
		}
		const isMatch = await bcrypt.compare(password, admin.password);
		if (!isMatch) {
			return res.status(400).render("admin/login-admin", {
				title: "SynDol Admin Login",
				errors: ["Invalid admin credentials."],
			});
		}
		const token = jwt.sign(
			{
				id: admin.id,
				email: admin.email,
				username: admin.username,
				role: "admin",
			},
			process.env.JWT_SECRET || "fallback-secret",
			{ expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
		);
		res.cookie("admin_token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 24 * 60 * 60 * 1000,
		});
		// Absolute path redirect admin role
		res.redirect("/admin/dashboard");
	} catch (error) {
		console.error("Admin Login error:", error);
		res.status(500).render("admin/login-admin", {
			title: "SynDol Admin Login",
			errors: ["Server error during admin login."],
		});
	}
});

// POST /auth/logout - Clear authentication cookie for client
router.post("/logout", (req, res) => {
    res.clearCookie("client_token");
    return res.redirect("/auth/login");
});

// POST /auth/logout-admin - Clear authentication cookie for admin
router.post("/logout-admin", (req, res) => {
    res.clearCookie("admin_token");
    return res.redirect("/auth/login-admin");
});

// authRoutes.js
router.get("/me", verifyToken, (req, res) => {
    try {
        // Fetch fresh record directly from database
        const stmt = db.prepare("SELECT id, username, email, role, created_at FROM users WHERE id = ?");
        const currentUser = stmt.get(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        return res.json({ success: true, user: currentUser });
    } catch (error) {
        console.error("Error fetching me:", error);
        return res.status(500).json({ success: false, message: "Database query failed." });
    }
});

module.exports = router;