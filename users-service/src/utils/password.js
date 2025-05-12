import bcrypt from "bcrypt";

export async function encryptPassword(password) {
    if (!password) {
        throw new Error("Password is required. Encryption failed");
    }
    // Mot de passe compose de lettres, chiffres et underscores. 6 a 12 caracteres.
    const regexPattern = /^[a-zA-Z0-9_]{6,12}$/;
    if (!regexPattern.test(password)) {
        throw new Error("Invalid password format. It must be 6 to 12 characters long and contain only letters, numbers, or underscores.");
    }
    return await bcrypt.hash(password, 10);
}

// export async function compareOldPassword(oldPassword, user) {
//     // Boolean
//     const isValidPassword = await bcrypt.compare(oldPassword, user.password);

//     if (!isValidPassword) {
//         throw new Error("Old password doesn't match");
//     }
// }

