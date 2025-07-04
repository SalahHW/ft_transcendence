import { User, UserRole } from "../user";
import { Avatar } from "../avatar";
import { Match } from "../match";

export const mockProfile = {
	user: {
		id: 42,
		username: "devuser",
		email: "devuser@example.com",
		createdAt: new Date("2024-01-01T12:00:00Z"),
		role: UserRole.USER,
		matchesId: [101, 102, 103, 104]
	} as User,
	avatar: {
		id: 1,
		userId: 42,
		avatarName: "devuser.png"
	} as Avatar,
	matches: [
		{
			matchId: 101,
			player1: "devuser",
			player2: "alice",
			player1Score: 11,
			player2Score: 7,
			winner: "devuser"
		},
		{
			matchId: 102,
			player1: "bob",
			player2: "devuser",
			player1Score: 5,
			player2Score: 11,
			winner: "devuser"
		},
		{
			matchId: 103,
			player1: "devuser",
			player2: "charlie",
			player1Score: 8,
			player2Score: 11,
			winner: "charlie"
		},
		{
			matchId: 104,
			player1: "devuser",
			player2: "alice",
			player1Score: 11,
			player2Score: 9,
			winner: "devuser"
		}
	] as Match[]
};
