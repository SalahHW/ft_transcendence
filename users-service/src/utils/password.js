import bcrypt from "bcrypt";
import { readUser } from "../controllers/userControllers.js";

export async function encryptPassword(password) {

    return await bcrypt.hash(password, 10);
}

export async function comparePassword(oldPassword) {

    const validPassword = await bcrypt.compare(oldPassword, readUser().password);

    if (!validPassword) {
        
    }
}
