const jwt = require("jsonwebtoken");
const db = require("../config/db");
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

// Single, unified middleware to secure all chat and admin routes
const verifyToken = (req, res, next) => {
    const isAdminRoute = req.originalUrl.startsWith("/admin");
    const token = isAdminRoute ? req.cookies?.admin_token : req.cookies?.client_token;
    const cookieName = isAdminRoute ? "admin_token" : "client_token";
    const loginRedirect = isAdminRoute ? "/auth/login-admin" : "/auth/login";
    
    // Force redirect if no authentication cookie exists
    if (!token) {
        return res.redirect(loginRedirect);
    }
    try {
        // Decode and verify JWT payload
        const decoded = jwt.verify(token, JWT_SECRET);

        // Query the appropriate table based on the decoded token's role
        let dbUser = null;
        if (isAdminRoute && decoded.role === "admin") {
            const adminStmt = db.prepare("SELECT id, username, email, role FROM admin WHERE id = ?");
            dbUser = adminStmt.get(decoded.id);
        } else if (!isAdminRoute) {
            const userStmt = db.prepare("SELECT id, username, email, role FROM users WHERE id = ?");
            dbUser = userStmt.get(decoded.id);
        }

        // Reject access if account does not exist in SQLite database
        if (!dbUser) {
            res.clearCookie("cookieName");
            return res.redirect(loginRedirect);
        }

        // Attach fresh database record to request and template views
        req.user = dbUser;
        res.locals.user = dbUser;
        next();
    } catch (err) {

        // Clear invalid/expired tokens and redirect to appropriate login page
        res.clearCookie("cookieName");
        return res.redirect(loginRedirect);
    }
};

// Role enforcement middleware (e.g., requireRole('admin'))
const requireRole = (expectedRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect("/auth/login-admin");
        }
        const userRole = String(req.user.role || "").toLowerCase();
        const requiredRole = String(expectedRole).toLowerCase();
        if (userRole !== requiredRole) {
            if (requiredRole === "admin") {
                return res.redirect("/auth/login-admin?error=admin_required");
            }
            return res.redirect("/auth/login?error=unauthorized");
        }
        next();
    };
};
module.exports = { verifyToken, requireRole };