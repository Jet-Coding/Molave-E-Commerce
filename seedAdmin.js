const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function seedAdmin() {
	const adminUsername = "admin";
	const adminEmail = "admin@molave.com";
	const rawPassword = "AdminPassword!19yn4ol"; // Change to your preferred password
	try {
		// Check if the admin user already exists
		const checkStmt = db.prepare(
			"SELECT * FROM admin WHERE username = ? OR email = ?",
		);
		const existingAdmin = checkStmt.get(adminUsername, adminEmail);
		if (existingAdmin) {
			console.log("⚠️  Admin user already exists in molave.db!");
			process.exit(0);
		}
		// Hash the admin password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(rawPassword, salt);
		// Insert default admin record
		const insertStmt = db.prepare(`INSERT INTO admin (username, email, password, role) VALUES (?, ?, ?, ?)`);
		insertStmt.run(adminUsername, adminEmail, hashedPassword, "admin");
		console.log("==========================================");
		console.log("✅ Default admin account created successfully!");
		console.log(`Username: ${adminUsername}`);
		console.log(`Email:    ${adminEmail}`);
		console.log(`Password: ${rawPassword}`);
		console.log(`Role:     admin`);
		console.log("==========================================");
	} catch (error) {
		console.error("❌ Error seeding admin user:", error);
	} finally {
		process.exit(0);
	}
}
seedAdmin();