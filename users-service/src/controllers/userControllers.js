import * as userModels from '../models/userModels.js';
import { createUsername } from './usernameControllers.js';
import { createEmail } from './emailControllers.js';
import { createPassword } from './passwordControllers.js';

export async function createUser(request) {
    const { username, password, email, walletAddress } = request.body;

    if (!username || !password || !email || !walletAddress) {
        throw new Error('Lack of information related to the user');
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw new Error('Invalid wallet address format');
    }

    const usernameExists = await userModels.userExists(username);
    if (usernameExists) {
        throw new Error('User already exists');
    }

    const emailLower = createEmail(email).toLowerCase();
    const emailExists = await userModels.emailExists(emailLower);
    if (emailExists) {
        throw new Error('Email already used');
    }

    const newUsername = createUsername(username);
    const hashedPassword = await createPassword(password);

    const newUser = await userModels.createUser({
        username: newUsername,
        password: hashedPassword,
        email: emailLower,
        walletAddress,
    });

    return newUser;
}

export async function readUser(request, reply) {
    const userId = request.params.id;

    if (!userId) {
        return reply.code(400).send({ error: 'UserId is required' });
    }
    try {
        const user = await userModels.readUser(userId);
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }
        delete user.password;
        return reply.code(200).send(user);
    } catch (error) {
        return reply.code(500).send({
            error: 'Failed to read the user',
            cause: error.message,
        });
    }
}

export async function readUserByUsername(request, reply) {
    const username = request.params.username;

    if (!username) {
        return reply.code(400).send({ error: 'Username is required' });
    }

    try {
        const user = await userModels.readUserByUsername(
            username.toLowerCase()
        );
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }
        delete user.password;
        return reply.code(200).send(user);
    } catch (error) {
        return reply.code(500).send({
            error: 'Failed to read the user',
            cause: error.message,
        });
    }
}

export async function readAllUsers(request, reply) {
    try {
        const users = await userModels.readAllUsers();
        if (!users) {
            return reply.code(404).send({ error: 'No users found' });
        }
        return reply.code(200).send(users);
    } catch (error) {
        return reply.code(500).send({
            error: 'Failed to read all users',
            cause: error.message,
        });
    }
}

export async function updateUser(request, reply) {
    const userId = request.params.id;
    const { username, password, email } = request.body;

    if (!userId) {
        return reply.code(400).send({ error: 'UserId is required' });
    }
    try {
        const updatedUser = await userModels.updateUser(userId, {
            username,
            password,
            email,
        });
        return reply.code(200).send(updatedUser);
    } catch (error) {
        return reply.code(500).send({
            error: 'Failed to update the user',
            cause: error.message,
        });
    }
}

export async function deleteUser(request, reply) {
    const userId = request.params.id;

    if (!userId) {
        return reply.code(400).send({ error: 'UserId is required' });
    }
    try {
        const deletedUserId = await userModels.deleteUser(userId);
        if (!deletedUserId) {
            return reply.code(404).send({ error: 'User not found' });
        }
        return reply.code(204).send();
    } catch (error) {
        return reply.code(500).send({
            error: 'Failed to delete the user',
            cause: error.message,
        });
    }
}
