import bcrypt from 'bcrypt';

const users = [
    {
        id: 1,
        email: 'user@example.com',
        password: bcrypt.hashSync('password123', 10),
        is2fa: false
    }
];

export default users;
