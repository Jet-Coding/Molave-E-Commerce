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
            title: "Sandbox Chat",
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

router.get('/', verifyToken, (req, res) => {
    const currentUserId = req.user.id;

    // 1. Get followed contacts
    const contactsStmt = db.prepare(`
        SELECT u.id, u.username, u.email 
        FROM users u 
        INNER JOIN follows f ON u.id = f.followee_id 
        WHERE f.follower_id = ?
        ORDER BY u.username ASC
    `);
    const contacts = contactsStmt.all(currentUserId);

    // 2. Get discoverable users (not yet followed & not current user)
    const discoverStmt = db.prepare(`
        SELECT id, username, email 
        FROM users 
        WHERE id != ? 
        AND id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
        ORDER BY username ASC
    `);
    const discoverUsers = discoverStmt.all(currentUserId, currentUserId);

    res.render('client/index', {
        title: 'Sandbox Chat',
        user: req.user,
        contacts: contacts,
        discoverUsers: discoverUsers
    });
});

// Follow user API endpoint
router.post('/api/follow', verifyToken, (req, res) => {
    const { followeeId } = req.body;
    const followerId = req.user.id;

    if (!followeeId) {
        return res.status(400).json({ error: 'Missing followeeId' });
    }

    try {
        const stmt = db.prepare('INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)');
        stmt.run(followerId, followeeId);
        return res.json({ success: true });
    } catch (err) {
        console.error('Follow error:', err);
        return res.status(500).json({ error: 'Failed to follow user' });
    }
});

module.exports = router;