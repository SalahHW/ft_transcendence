import bcrypt from 'bcrypt';
import users from '../../models/users.js';

export default async function authRoutes(app, options) {
    app.post('/auth/login', async (request, reply) => {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.status(400).send({ error: 'Email and password are required' });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            return reply.status(401).send({ error: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return reply.status(401).send({ error: 'Invalid email or password' });
        }

        const token = app.jwt.sign({
            id: user.id,
            email: user.email
        });

        return reply.send({ token });
    });
}
