import { Match } from "../match";
import { mockProfile } from "./mockProfile";

export default class MockMatchesApi {
    public async getMatch(matchId: number): Promise<Match> {
        console.log(`Mock getMatch for matchId ${matchId}`);
        const match = mockProfile.matches.find(m => m.matchId === matchId);
        if (match) {
            return Promise.resolve(match);
        }
        return Promise.reject("Match not found");
    }

    public async createMatch(player1: string, player2: string, player1Score: number, player2Score: number, winner: string): Promise<Match> {
        console.log(`Mock createMatch`);
        const newMatch: Match = {
            matchId: Math.floor(Math.random() * 1000),
            player1,
            player2,
            player1Score,
            player2Score,
            winner
        };
        mockProfile.matches.push(newMatch);
        return Promise.resolve(newMatch);
    }
}
