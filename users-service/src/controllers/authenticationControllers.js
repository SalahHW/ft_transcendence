import { createUser } from './userControllers.js';
import { readUserByUsername } from '../models/userModels.js';
import { comparePassword } from '../utils/password.js';
import fetch from 'node-fetch';

const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL;

export const registerUser = async (request, reply) => {
    const { username, walletAddress } = request.body;

    try {
        const newUser = await createUser(request);

        const res = await fetch(`${BLOCKCHAIN_SERVICE_URL}/add-player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: username, address: walletAddress }),
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            request.log.warn({
                msg: 'Blockchain registration failed',
                status: res.status,
                error: errJson.error || 'Unknown error',
            });

            return reply.code(502).send({
                error: 'User created but blockchain registration failed',
                user: newUser,
            });
        }

        request.log.info(`User ${username} registered on-chain.`);
        return reply.code(201).send(newUser);
    } catch (error) {
        return reply.code(400).send({
            error: error.message || 'Registration failed',
        });
    }
};
export const loginUser = async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password)
        return reply
            .code(401)
            .send({ error: 'Username and password are required' });

    try {
        const user = await readUserByUsername(username);
        if (!user) {
            return reply.code(401).send({ error: 'Invalid username' });
        }

        const isValidPass = await comparePassword(password, user.password);
        if (!isValidPass) {
            return reply.code(401).send({ error: 'Invalid password' });
        }

        const token = await request.server.signToken({
            sub: user.id,
            username: user.username,
            aud: 'users-service',
        });

        reply
            .setCookie('token', token, {
                httpOnly: true,
                // secure: process.env.NODE_ENV === "production",
                secure: false, // TODO: Update .env to set production mode
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 60 * 24, // 1 day
            })
            .code(200)
            .send({ message: 'Login successful' });
    } catch (error) {
        return reply
            .code(500)
            .send({ error: 'Login failed', cause: error.message });
    }
};
