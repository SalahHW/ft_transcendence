import onlinePlayers from "../config.js";

export async function addOnlinePlayer(request) {
    const { userId } = request.params.id;

    onlinePlayers.push(userId);
}