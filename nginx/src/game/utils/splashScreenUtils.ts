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
import WinSemiFinalGamePage from '../../views/gamePages/tournament/semiFinals/winSemiFinalGamePage.js';
import LoseSemiFinalGamePage from '../../views/gamePages/tournament/semiFinals/loseSemiFinalGamePage.js';

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
    matchType?: 'regular' | 'semi-final' | 'final';
    gameStats: {
        totalRebounds: number;
        forfeit?: boolean;
        reason?: 'player_left' | 'disconnect';
        matchType?: 'regular' | 'semi-final' | 'final';
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

/**
 * Test function to manually trigger semi-final splash screen
 * (for debugging purposes)
 */
export function testSemiFinalSplash(): void {
    console.log('🏆 TEST: Triggering test semi-final splash screen...');
    showSemiFinalSplashScreen(true, "TestOpponent", "3-2", 3000);
}

// Make it available globally for console testing
(window as any).testSemiFinalSplash = testSemiFinalSplash;

/**
 * Show semi-final result splash screen overlay (superimposed on game)
 * @param isWinner - Whether the local player won
 * @param opponentName - Opponent's name
 * @param score - Final score string
 * @param duration - How long to display in milliseconds (default: 5000ms)
 * @returns Promise that resolves when splash screen is complete
 */
export function showSemiFinalSplashScreen(
    isWinner: boolean,
    opponentName: string,
    score: string = '',
    duration: number = 5000
): Promise<void> {
    console.log('🏆 DEBUG: showSemiFinalSplashScreen called with:', { isWinner, opponentName, score, duration });
    
    return new Promise((resolve) => {
        try {
            console.log('🏆 DEBUG: Creating splash overlay...');
            
            // Create splash screen overlay container
            const splashOverlay = document.createElement('div');
            splashOverlay.id = 'semifinal-splash-screen';
            splashOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                pointer-events: none;
                animation: fadeIn 0.5s ease-in-out;
            `;

            console.log('🏆 DEBUG: Splash overlay created');

            // Create a temporary container for the splash page
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-semifinal-container';
            tempContainer.style.cssText = `
                width: 100%;
                height: 100%;
            `;
            
            splashOverlay.appendChild(tempContainer);
            console.log('🏆 DEBUG: Temp container created and appended');

            // Add styles for animations
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(styleSheet);
            console.log('🏆 DEBUG: Styles added to head');

            // Add to DOM
            document.body.appendChild(splashOverlay);
            console.log('🏆 DEBUG: Splash overlay added to DOM');

            // Create and render the appropriate splash page
            let splashPage: WinSemiFinalGamePage | LoseSemiFinalGamePage;
            
            console.log('🏆 DEBUG: Creating splash page...', isWinner ? 'WIN' : 'LOSE');
            
            if (isWinner) {
                console.log('🏆 DEBUG: Playing win sound...');
                soundManager.playSound('semi-final-win', 1.0);
                console.log('🏆 DEBUG: Creating WinSemiFinalGamePage...');
                splashPage = new WinSemiFinalGamePage('temp-semifinal-container', opponentName, score);
            } else {
                console.log('🏆 DEBUG: Playing lose sound...');
                soundManager.playSound('semi-final-lose', 1.0);
                console.log('🏆 DEBUG: Creating LoseSemiFinalGamePage...');
                splashPage = new LoseSemiFinalGamePage('temp-semifinal-container', opponentName, score);
            }
            
            console.log('🏆 DEBUG: Rendering splash page...');
            splashPage.render();
            console.log('🏆 DEBUG: Splash page rendered successfully');
            
            console.log(`🏆 Showing semi-final splash: ${isWinner ? 'WIN' : 'LOSE'} vs ${opponentName} for ${duration}ms`);

            // Remove splash screen after duration
            setTimeout(() => {
                console.log('🏆 DEBUG: Starting fade out...');
                // Fade out animation
                splashOverlay.style.animation = 'fadeOut 0.5s ease-in-out';
                
                setTimeout(() => {
                    console.log('🏆 DEBUG: Cleaning up splash page...');
                    // Clean up the splash page
                    splashPage.cleanup();
                    
                    // Remove from DOM
                    if (splashOverlay.parentNode) {
                        splashOverlay.parentNode.removeChild(splashOverlay);
                    }
                    // Remove styles
                    if (styleSheet.parentNode) {
                        styleSheet.parentNode.removeChild(styleSheet);
                    }
                    console.log('🏆 Semi-final splash screen removed');
                    resolve();
                }, 500); // Wait for fade out animation
            }, duration);
            
        } catch (error) {
            console.error('🏆 ERROR: Error in showSemiFinalSplashScreen:', error);
            resolve(); // Resolve anyway to prevent hanging
        }
    });
}
