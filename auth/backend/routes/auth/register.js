import bcrypt from 'bcrypt';
import users from '../../models/users.js';

export default async function registerRoute(app) {
    app.post('/auth/register', async (request, reply) => {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.status(400).send({ error: 'Email and password are required' });
        }

        const emailExists = users.find(u => u.email === email);
        if (emailExists) {
            return reply.status(409).send({ error: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 10);

        const newUser = {
            id: users.length + 1,
            email,
            password: hashed,
            is2fa: false
        };

        users.push(newUser); // In futur add to DB

        const accessToken = app.jwt.sign(
            { id: newUser.id, email: newUser.email },
            { expiresIn: '15m' }
        );

        const refreshToken = app.jwt.sign(
            { id: newUser.id },
            { expiresIn: '7d' }
        );

        return reply.status(201).send({ token });
    });
}
