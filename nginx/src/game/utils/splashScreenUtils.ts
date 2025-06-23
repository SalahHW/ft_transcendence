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
import WinGamePage from '../../views/gamePages/1v1/winGamePage.js';
import LoseGamePage from '../../views/gamePages/1v1/loseGamePage.js';

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
    gameStats: {
        totalRebounds: number;
        forfeit?: boolean;
        reason?: 'player_left' | 'disconnect';
    };
    matchEndTime: Date;
}

/**
 * Show win/loss splash screen based on game end data
 * @param gameEndData - Data about the game result
 * @param localPlayerId - ID of the current player
 */
export function showGameEndSplashScreen(gameEndData: GameEndData, localPlayerId: string | null): void {
    const isWinner = gameEndData.winner.id === localPlayerId;
    const opponentName = isWinner ? gameEndData.loser.username : gameEndData.winner.username;
    const score = `${gameEndData.winner.score}-${gameEndData.loser.score}`;

    // Play appropriate sound
    if (isWinner) {
        soundManager.playSound('winnerSound', 1.0);
        const winPage = new WinGamePage('app-container', opponentName, score);
        winPage.render();
    } else {
        soundManager.playSound('loserSound', 1.0);
        const losePage = new LoseGamePage('app-container', opponentName, score);
        losePage.render();
    }
}
