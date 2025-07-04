/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   splashScreenUtils.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 00:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/01/27 00:00:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { soundManager } from '../audio/soundManager.js';

export interface GameEndData {
    winner: {
        id: string;
        username: string;
        score: number;
    };
    loser: {
        id: string;
        username: string;
        score: number;
    };
    roomId: string;
    matchDuration: number;
    matchType?: 'regular';
    gameStats: {
        totalRebounds: number;
        forfeit?: boolean;
        reason?: 'player_left' | 'disconnect';
        matchType?: 'regular';
        [key: string]: any;
    };
    matchEndTime: Date;
}

/**
 * Show win/loss splash screen based on game end data
 * @param gameEndData - Data about the game result
 * @param localPlayerId - ID of the current player
 */
export async function showGameEndSplashScreen(gameEndData: GameEndData, localPlayerId: string | null): Promise<void> {
    const isWinner = gameEndData.winner.id === localPlayerId;
    const opponentName = isWinner ? gameEndData.loser.username : gameEndData.winner.username;
    const score = `${gameEndData.winner.score}-${gameEndData.loser.score}`;

    // Dynamically import the page classes to avoid circular dependencies
    if (isWinner) {
        soundManager.playSound('winnerSound', 1.0);
        const { default: WinGamePage } = await import('../../views/gamePages/1v1/winGamePage.js');
        const winPage = new WinGamePage('app-container', opponentName, score);
        winPage.render();
    } else {
        soundManager.playSound('loserSound', 1.0);
        const { default: LoseGamePage } = await import('../../views/gamePages/1v1/loseGamePage.js');
        const losePage = new LoseGamePage('app-container', opponentName, score);
        losePage.render();
    }
} 