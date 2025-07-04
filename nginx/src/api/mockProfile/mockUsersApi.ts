import { User, UserRole } from "../user";
import { mockProfile } from "./mockProfile";

export default class MockUsersApi {
    public async getCurrentUser(): Promise<User> {
        return Promise.resolve(mockProfile.user);
    }

    public async login(username: string, password: string): Promise<User> {
        console.log(`Mock login for ${username} with password ${password}`);
        if (username === mockProfile.user.username) {
            return Promise.resolve(mockProfile.user);
        }
        return Promise.reject("Invalid credentials");
    }

    public async logout(): Promise<void> {
        console.log("Mock logout");
        return Promise.resolve();
    }

    public async register(username: string, password: string, email: string): Promise<User> {
        console.log(`Mock register for ${username} with email ${email} and password ${password}`);
        const newUser: User = {
            id: Math.floor(Math.random() * 1000),
            username,
            email,
            createdAt: new Date(),
            role: UserRole.USER,
            matchesId: []
        };
        return Promise.resolve(newUser);
    }
}
