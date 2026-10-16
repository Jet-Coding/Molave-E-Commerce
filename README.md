SynDol Real-Time Chat Application: Production & Technical Documentation.
1. System Architecture Overview The SynDol Chat Application is built as an asynchronous,
event-driven web platform utilizing Node.js, Express, Socket.io, and an embedded SQLite database using better-sqlite3.
- Core Runtime: Node.js v24+ executing an Express app wrapped inside Node's native HTTP server instance.
- Database Layer: Synchronous, persistent SQLite instance configured in Write-Ahead Logging (WAL) mode.
- Authentication Security: Stateless, HTTP-only JWT session cookies verified directly against active database rows.
- Real-time Pipeline: Socket.io multiplexed over the HTTP server pipeline for instantaneous bidirectional message handling.
2. Structural Configuration & Database Schema
Database Configuration (config/db.js)
The application enforces strict data persistence using better-sqlite3 initialized in WAL mode to allow high-concurrency read/write transactions.
