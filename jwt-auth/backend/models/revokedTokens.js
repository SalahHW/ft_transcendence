const revokedMap = {}; // { "0xaddress" => timestamp }

export function revokeAll(address) {
    revokedMap[address.toLowerCase()] = Date.now();
}

export function getRevokedSince(address) {
    return revokedMap[address.toLowerCase()] || null;
}