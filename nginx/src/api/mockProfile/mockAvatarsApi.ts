import { Avatar } from "../avatar";
import { mockProfile } from "./mockProfile";

export default class MockAvatarsApi {
    public async getAvatar(userId: number): Promise<Avatar> {
        console.log(`Mock getAvatar for userId ${userId}`);
        if (userId === mockProfile.avatar.userId) {
            return Promise.resolve(mockProfile.avatar);
        }
        return Promise.reject("Avatar not found");
    }

    public async createAvatar(userId: number, avatarName: string): Promise<Avatar> {
        console.log(`Mock createAvatar for userId ${userId} with avatarName ${avatarName}`);
        const newAvatar: Avatar = {
            id: Math.floor(Math.random() * 1000),
            userId,
            avatarName
        };
        return Promise.resolve(newAvatar);
    }

    public async updateAvatar(userId: number, avatarName: string): Promise<Avatar> {
        console.log(`Mock updateAvatar for userId ${userId} with avatarName ${avatarName}`);
        if (userId === mockProfile.avatar.userId) {
            mockProfile.avatar.avatarName = avatarName;
            return Promise.resolve(mockProfile.avatar);
        }
        return Promise.reject("Avatar not found");
    }

    public async deleteAvatar(userId: number): Promise<void> {
        console.log(`Mock deleteAvatar for userId ${userId}`);
        if (userId === mockProfile.avatar.userId) {
            return Promise.resolve();
        }
        return Promise.reject("Avatar not found");
    }
}
