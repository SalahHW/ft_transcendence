/**
 * Tournament utility functions
 */
export class TournamentUtils {
    /**
     * Get placement suffix for display (1st, 2nd, 3rd, 4th)
     * @param placement - The placement number
     * @returns The placement suffix string
     */
    static getPlacementSuffix(placement: number): string {
        switch (placement) {
            case 1: return 'st';
            case 2: return 'nd'; 
            case 3: return 'rd';
            default: return 'th';
        }
    }

    /**
     * Log tournament client event
     * @param event - Event type
     * @param details - Event details
     */
    static logTournamentEvent(event: string, details: any): void {
        console.log(`🏆 TOURNAMENT CLIENT: ${event}`, details);
    }

    /**
     * Get opponent name from game end data
     * @param gameEndData - Game result data
     * @param localPlayerId - Current player's ID
     * @returns Opponent's name
     */
    static getOpponentName(gameEndData: any, localPlayerId: string | null): string {
        if (gameEndData.winner.id === localPlayerId) {
            return gameEndData.loser.username || 'Opponent';
        } else {
            return gameEndData.winner.username || 'Opponent';
        }
    }

    /**
     * Get score string from game end data
     * @param gameEndData - Game result data
     * @returns Score string (e.g., "11-5")
     */
    static getScoreString(gameEndData: any): string {
        return `${gameEndData.winner.score}-${gameEndData.loser.score}`;
    }

    /**
     * Check if player is winner
     * @param gameEndData - Game result data
     * @param localPlayerId - Current player's ID
     * @returns True if player is winner
     */
    static isWinner(gameEndData: any, localPlayerId: string | null): boolean {
        return gameEndData.winner.id === localPlayerId;
    }
} 