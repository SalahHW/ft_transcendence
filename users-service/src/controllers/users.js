import { fetchUsers, addUser, userExists } from '../services/userServices.js';

export const getUsers = async (request, reply) => {
  try {
    const users = await fetchUsers();
    reply.statusCode = 200;
    return { users };
  } catch (err) {
    reply.statusCode = 500;
    return { error: 'Failed to fetch users' };
  }
};

export const createUser = async (request, reply) => {
  const { username, password } = request.body;
  try {
    const exists = await userExists(username);
    if (exists) {
      reply.statusCode = 400;
      return { error: 'User already exists' };
    }
    const user = await addUser(username, password);
    reply.statusCode = 201;
    return { message: 'User created', user };
  } catch (err) {
    reply.statusCode = 500;
    return { error: 'Failed to create user' };
  }
};