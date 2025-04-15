const users = {};

export function getUser(address) {
    return users[address.toLowerCase()] || null;
}

export function createOrGetUser(address) {
    const addr = address.toLowerCase();
    if (!users[addr]) {
        users[addr] = {
            address: addr,
            nonce: Math.floor(Math.random() * 1e6).toString()
        };
    }
    return users[addr];
}

export function updateNonce(address) {
    const user = getUser(address);
    if (!user) return null;
    user.nonce = Math.floor(Math.random() * 1e6).toString();
    return user.nonce;
}
