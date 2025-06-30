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
import FirstFinalGamePage from '../../views/gamePages/tournament/finals/firstFinalGamePage.js';
import SecondFinalGamePage from '../../views/gamePages/tournament/finals/secondFinalGamePage.js';
import ThirdFinalGamePage from '../../views/gamePages/tournament/finals/thirdFinalGamePage.js';
import FourthFinalGamePage from '../../views/gamePages/tournament/finals/fourthFinalGamePage.js';

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
    finalMatchType?: 'winners' | 'losers'; // ⭐ ADD: Which type of final (for placement calculation)
    gameStats: {
        totalRebounds: number;
        forfeit?: boolean;
        reason?: 'player_left' | 'disconnect';
        matchType?: 'regular' | 'semi-final' | 'final';
        finalMatchType?: 'winners' | 'losers'; // ⭐ ADD: Also in gameStats
        [key: string]: any;
    };
    matchEndTime: Date;
    tournamentAdvancement?: {
        stage: string;
        result: string;
        message: string;
        finalPlacement?: number;
    };
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

/**
 * Test function to manually trigger final splash screens
 * (for debugging purposes)
 */
export function testFinalSplash(placement: 1 | 2 | 3 | 4): void {
    console.log(`🏆 TEST: Triggering test final splash screen for ${placement}${getPlacementSuffix(placement)} place...`);
    showFinalSplashScreen(placement, "TestOpponent", "3-2", 3000);
}

/**
 * Test function to validate final placement logic with mock data
 * (for debugging purposes)
 */
export function testFinalPlacementLogic(): void {
    console.log('🏆 TEST: Validating final placement logic...');
    
    // Test scenarios
    const scenarios = [
        { finalMatchType: 'winners', isWinner: true, expectedPlacement: 1, description: 'Winners Final Winner → 1st Place' },
        { finalMatchType: 'winners', isWinner: false, expectedPlacement: 2, description: 'Winners Final Loser → 2nd Place' },
        { finalMatchType: 'losers', isWinner: true, expectedPlacement: 3, description: 'Losers Final Winner → 3rd Place' },
        { finalMatchType: 'losers', isWinner: false, expectedPlacement: 4, description: 'Losers Final Loser → 4th Place' },
    ];
    
    scenarios.forEach((scenario, index) => {
        console.log(`\n🏆 TEST ${index + 1}: ${scenario.description}`);
        
        // Simulate the placement logic
        let calculatedPlacement: 1 | 2 | 3 | 4;
        const isWinnersFinal = scenario.finalMatchType === 'winners';
        const isLosersFinal = scenario.finalMatchType === 'losers';
        
        if (isWinnersFinal) {
            calculatedPlacement = scenario.isWinner ? 1 : 2;
        } else if (isLosersFinal) {
            calculatedPlacement = scenario.isWinner ? 3 : 4;
        } else {
            calculatedPlacement = 1; // fallback
        }
        
        const isCorrect = calculatedPlacement === scenario.expectedPlacement;
        console.log(`   Input: finalMatchType=${scenario.finalMatchType}, isWinner=${scenario.isWinner}`);
        console.log(`   Expected: ${scenario.expectedPlacement}, Calculated: ${calculatedPlacement}`);
        console.log(`   ✅ Result: ${isCorrect ? 'CORRECT' : '❌ INCORRECT'}`);
        
        if (!isCorrect) {
            console.error(`🏆 ERROR: Placement logic failed for scenario: ${scenario.description}`);
        }
    });
    
    console.log('\n🏆 TEST: Final placement logic validation complete');
}

/**
 * Test function to verify final placement + navigation flow
 * (for debugging purposes)
 */
export function testFinalWithNavigation(placement: 1 | 2 | 3 | 4): void {
    console.log(`🏆 TEST: Testing final placement ${placement} with navigation...`);
    
    // Import tournament handler
    import('../tournament/tournamentClientHandler.js').then((module) => {
        const TournamentClientHandler = module.default;
        
        // Mock game end data
        const mockGameEndData = {
            winner: { id: 'test-player', username: 'Test Player', score: 3 },
            loser: { id: 'opponent', username: 'Test Opponent', score: 1 },
            roomId: 'test-final-room',
            matchDuration: 120000,
            gameStats: { totalRebounds: 10 },
            matchEndTime: new Date()
        };
        
        // Call the handler
        TournamentClientHandler.handleFinalGameEnd(
            mockGameEndData,
            'test-player',
            'Test Opponent',
            placement
        ).then(() => {
            console.log(`🏆 TEST: Final placement ${placement} with navigation completed`);
        }).catch((error) => {
            console.error(`🏆 TEST ERROR: Final placement ${placement} test failed:`, error);
        });
    }).catch((error) => {
        console.error('🏆 TEST ERROR: Failed to import tournament handler:', error);
    });
}

// Make it available globally for console testing
(window as any).testSemiFinalSplash = testSemiFinalSplash;
(window as any).testFinalSplash = testFinalSplash;
(window as any).testFinalPlacementLogic = testFinalPlacementLogic;
(window as any).testFinalWithNavigation = testFinalWithNavigation;

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
                soundManager.playSound('semiFinalWin', 1.0);
                console.log('🏆 DEBUG: Creating WinSemiFinalGamePage...');
                splashPage = new WinSemiFinalGamePage('temp-semifinal-container', opponentName, score);
            } else {
                console.log('🏆 DEBUG: Playing lose sound...');
                soundManager.playSound('semiFinalLose', 1.0);
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

/**
 * Show final result splash screen with appropriate placement (1st, 2nd, 3rd, 4th)
 * @param finalPlacement - The player's final placement (1, 2, 3, or 4)
 * @param opponentName - Opponent's name from the final match
 * @param score - Final score string
 * @param duration - How long to display in milliseconds (default: 5000ms)
 * @returns Promise that resolves when splash screen is complete
 */
export function showFinalSplashScreen(
    finalPlacement: 1 | 2 | 3 | 4,
    opponentName: string,
    score: string = '',
    duration: number = 5000
): Promise<void> {
    console.log('🏆 DEBUG: showFinalSplashScreen called with:', { finalPlacement, opponentName, score, duration });
    
    return new Promise((resolve) => {
        try {
            console.log('🏆 DEBUG: Creating final splash overlay...');
            
            // Create splash screen overlay container
            const splashOverlay = document.createElement('div');
            splashOverlay.id = 'final-splash-screen';
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

            console.log('🏆 DEBUG: Final splash overlay created');

            // Create a temporary container for the splash page
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-final-container';
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
            console.log('🏆 DEBUG: Final splash overlay added to DOM');

            // Create and render the appropriate final placement page
            let splashPage: FirstFinalGamePage | SecondFinalGamePage | ThirdFinalGamePage | FourthFinalGamePage;
            
            console.log('🏆 DEBUG: Creating final placement page...', finalPlacement);
            
            // Play appropriate sound and create page based on placement
            switch (finalPlacement) {
                case 1:
                    console.log('🏆 DEBUG: Playing first-place sound...');
                    soundManager.playSound('firstPlace', 1.0);
                    console.log('🏆 DEBUG: Creating FirstFinalGamePage...');
                    splashPage = new FirstFinalGamePage('temp-final-container', opponentName, score);
                    break;
                case 2:
                    console.log('🏆 DEBUG: Playing second-place sound...');
                    soundManager.playSound('secondPlace', 1.0);
                    console.log('🏆 DEBUG: Creating SecondFinalGamePage...');
                    splashPage = new SecondFinalGamePage('temp-final-container', opponentName, score);
                    break;
                case 3:
                    console.log('🏆 DEBUG: Playing third-place sound...');
                    soundManager.playSound('thirdPlace', 1.0);
                    console.log('🏆 DEBUG: Creating ThirdFinalGamePage...');
                    splashPage = new ThirdFinalGamePage('temp-final-container', opponentName, score);
                    break;
                case 4:
                    console.log('🏆 DEBUG: Playing fourth-place sound...');
                    soundManager.playSound('fourthPlace', 1.0);
                    console.log('🏆 DEBUG: Creating FourthFinalGamePage...');
                    splashPage = new FourthFinalGamePage('temp-final-container', opponentName, score);
                    break;
                default:
                    console.error('🏆 ERROR: Invalid final placement:', finalPlacement);
                    resolve();
                    return;
            }
            
            console.log('🏆 DEBUG: Rendering final placement page...');
            splashPage.render();
            console.log('🏆 DEBUG: Final placement page rendered successfully');
            
            console.log(`🏆 Showing final splash: ${finalPlacement}${getPlacementSuffix(finalPlacement)} PLACE vs ${opponentName} for ${duration}ms`);

            // Remove splash screen after duration
            setTimeout(() => {
                console.log('🏆 DEBUG: Starting final splash fade out...');
                // Fade out animation
                splashOverlay.style.animation = 'fadeOut 0.5s ease-in-out';
                
                setTimeout(() => {
                    console.log('🏆 DEBUG: Cleaning up final splash page...');
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
                    console.log('🏆 Final splash screen removed');
                    resolve();
                }, 500); // Wait for fade out animation
            }, duration);
            
        } catch (error) {
            console.error('🏆 ERROR: Error in showFinalSplashScreen:', error);
            resolve(); // Resolve anyway to prevent hanging
        }
    });
}

/**
 * Get placement suffix for display (1st, 2nd, 3rd, 4th)
 * @param placement - The placement number
 * @returns The placement suffix string
 */
function getPlacementSuffix(placement: number): string {
    switch (placement) {
        case 1: return 'st';
        case 2: return 'nd'; 
        case 3: return 'rd';
        default: return 'th';
    }
}
