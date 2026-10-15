const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// GET / - Render client chat workspace with dynamic users list
router.get("/", verifyToken, (req, res) => {
    try {
        const currentUserId = req.user.id;
        // Fetch registered users for the workspace sidebar
        const stmt = db.prepare("SELECT id, username, email FROM users WHERE id != ? ORDER BY username ASC");
        const usersList = stmt.all(currentUserId);

        return res.render("client/index", {
            title: "SynDol | ChatApp",
            user: req.user,
            usersList: usersList
        });
    } catch (error) {
        console.error("Error loading chat workspace:", error);
        return res.status(500).send("Internal Server Error");
    }
});

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
    const token = req.cookies?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
            
            // Query DB to verify user exists
            const stmt = db.prepare("SELECT id, username, email, role FROM users WHERE id = ?");
            const dbUser = stmt.get(decoded.id);
            req.user = dbUser || null;
        } catch (err) {
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
};

// GET / - Workspace Route
router.get('/', verifyToken, (req, res) => {
    const currentUserId = req.user.id;
    try {
        // Fetch users already followed by current user
        const contactsStmt = db.prepare(`
            SELECT u.id, u.username, u.email 
            FROM users u 
            INNER JOIN follows f ON u.id = f.followee_id 
            WHERE f.follower_id = ?
            ORDER BY u.username ASC
        `);
        const contacts = contactsStmt.all(currentUserId);
        // Fetch all other registered users available to follow
        const discoverStmt = db.prepare(`
            SELECT id, username, email 
            FROM users 
            WHERE id != ? 
            AND id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
            ORDER BY username ASC
        `);
        const discoverUsers = discoverStmt.all(currentUserId, currentUserId);
        // Pass database results to EJS
        res.render('client/index', {
            title: 'SynDol | ChatApp',
            user: req.user,
            contacts: contacts,
            discoverUsers: discoverUsers
        });
    } catch (err) {
        console.error('Error fetching users from database:', err);
        res.status(500).send('Server Error');
    }
});

// POST /api/follow - Create a follow connection in SQLite
router.post('/api/follow', verifyToken, (req, res) => {
    const { followeeId } = req.body;
    const followerId = req.user.id;
    if (!followeeId) {
        return res.status(400).json({ success: false, error: 'Missing target user ID.' });
    }
    try {
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO follows (follower_id, followee_id) 
            VALUES (?, ?)
        `);
        const result = insertStmt.run(followerId, followeeId);
        return res.json({ success: true, message: 'Successfully followed user.' });
    } catch (err) {
        console.error('Error inserting follow record:', err);
        return res.status(500).json({ success: false, error: 'Database transaction failed.' });
    }
});

module.exports = router;