document.addEventListener("DOMContentLoaded", () => {

	// Initialize Socket.io Connection
	const socket = io();
	
	// Load authenticated user data injected from EJS
	const senderName = window.currentUser || "Client";
	const senderId = window.currentUserId || "guest_user";
	const roomId = `room_${senderId}`;

	// Join dynamic Socket room
	socket.emit("join_room", { roomId });

	// DOM Elements
	const chatForm = document.getElementById("chat-form");
	const messageInput = document.getElementById("message-input");
	const messageFeed = document.getElementById("message-feed");
	const toggleInfoBtn = document.getElementById("toggle-info");
	const sidebarRight = document.getElementById("sidebar-right");

	// Handle Sending Messages
	if (chatForm) {
		chatForm.addEventListener("submit", (e) => {
			e.preventDefault();
			const text = messageInput.value.trim();
			if (!text) return;

			// Emit message to server matching server.js event handler
			socket.emit("send_message", {
				senderId,
				senderName,
				text,
				roomId
			});
			messageInput.value = "";
		});
	}

	// Handle Receiving Live Broadcasted Messages
	socket.on("receive_message", (data) => {
		const isOutgoing = String(data.senderId) === String(senderId);

		const messageGroup = document.createElement("div");
		messageGroup.className = `message-group ${isOutgoing ? "outgoing" : "incoming"}`;

		messageGroup.innerHTML = `
			${
				!isOutgoing
					? `<img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" alt="Avatar" class="avatar-small" />`
					: ""
			}
			<div class="bubble-wrapper">
				<div class="bubble">${escapeHTML(data.text)}</div>
				<span class="timestamp">${data.time}</span>
			</div>
		`;

		messageFeed.appendChild(messageGroup);
		
		// Auto-scroll to the bottom of the chat feed
		messageFeed.scrollTop = messageFeed.scrollHeight;
	});

	// 6. UI Toggle for Right Side Panel
	if (toggleInfoBtn && sidebarRight) {
		toggleInfoBtn.addEventListener("click", () => {
			sidebarRight.classList.toggle("collapsed");
		});
	}

	// Helper function to prevent XSS vulnerability in live messages
	function escapeHTML(str) {
		return str.replace(
			/[&<>'"]/g,
			(tag) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					"'": "&#39;",
					'"': "&quot;"
				}[tag] || tag)
		);
	}
});