import onlineUsers from "../config.js";

export function addOnlineUser(request, reply) {
	const { userId } = request.params;

	if (!userId) {
		return reply
			.code(400)
			.send({ error: "User ID needed" });
	}
	onlineUsers.push(userId);
	return reply
		.code(201)
		.send('User ${userId} added to the online list');
}

export function removeOnlineUser(request, reply) {
	const { userId } = request.params;

	if (!userId) {
		return reply
			.code(400)
			.send({ error: "User ID needed" });
	}
		const index = onlineUsers.indexOf(userId);
		if (index !== -1) {
			onlineUsers.splice(index, 1);
			return reply
				.code(200)
				.send('User ${userId} removed from the online list');
		} else {
			return reply
				.code(404)
				.send({ error: 'User ${userId} not found' });
		}
}

export function getOnlineUsers(request, reply) {
	return reply.code(200).send(onlineUsers);
}