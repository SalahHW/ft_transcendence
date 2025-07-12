/**
 * Splash screen utilities for displaying game start information
 */

let currentSplashScreenPromise: Promise<void> | null = null;
let currentSplashScreenResolve: (() => void) | null = null;
let currentSplashScreenTimeout: NodeJS.Timeout | null = null;

/**
 * Match type enum for splash screen indicators
 */
export enum MatchType {
    VERSUS = 'versus',
    SEMI_FINALS = 'semi_finals',
    WINNER_FINALS = 'winner_finals',
    LOSER_FINALS = 'loser_finals'
}

/**
 * Get display text for match type
 */
function getMatchTypeDisplayText(matchType: MatchType): string {
    switch (matchType) {
        case MatchType.VERSUS:
            return 'VERSUS';
        case MatchType.SEMI_FINALS:
            return 'SEMI_FINALS';
        case MatchType.WINNER_FINALS:
            return 'WINNER_FINALS';
        case MatchType.LOSER_FINALS:
            return 'LOSER_FINALS';
        default:
            return 'VERSUS';
    }
}

/**
 * Get color for match type indicator
 */
function getMatchTypeColor(matchType: MatchType): string {
    switch (matchType) {
        case MatchType.VERSUS:
            return '#3b82f6'; // Blue
        case MatchType.SEMI_FINALS:
            return '#f59e0b'; // Orange
        case MatchType.WINNER_FINALS:
            return '#10b981'; // Green
        case MatchType.LOSER_FINALS:
            return '#ef4444'; // Red
        default:
            return '#3b82f6'; // Blue
    }
}

/**
 * Create and display a splash screen showing opponent information
 * @param currentPlayerName - Current player's name
 * @param opponentName - Opponent's name
 * @param duration - How long to display the splash screen in milliseconds (default: 3000ms)
 * @param matchType - Type of match (versus, semi_finals, winner_finals, loser_finals)
 * @returns Promise that resolves when splash screen is complete
 */
export function showSplashScreen(
    currentPlayerName: string, 
    opponentName: string, 
    duration: number = 3000,
    matchType: MatchType = MatchType.VERSUS
): Promise<void> {
    // If there's already a splash screen running, interrupt it
    if (currentSplashScreenPromise) {
        removeSplashScreen();
    }

    return new Promise((resolve) => {
        currentSplashScreenPromise = Promise.resolve();
        currentSplashScreenResolve = resolve;
        
        // Create splash screen overlay
        const splashOverlay = document.createElement('div');
        splashOverlay.id = 'game-splash-screen';
        splashOverlay.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center';
        splashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.5s ease-in-out;
        `;

        // Create splash content
        const splashContent = document.createElement('div');
        splashContent.className = 'text-center text-white';
        splashContent.style.cssText = `
            text-align: center;
            color: white;
            animation: slideInUp 0.6s ease-out;
        `;

        // Add styles for animations
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideInUp {
                from { 
                    opacity: 0;
                    transform: translateY(30px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            @keyframes glow {
                0%, 100% { 
                    text-shadow: 0 0 20px currentColor;
                }
                50% { 
                    text-shadow: 0 0 30px currentColor, 0 0 40px currentColor;
                }
            }
        `;
        document.head.appendChild(styleSheet);

        // Title
        const title = document.createElement('h1');
        title.textContent = 'MATCH STARTING';
        title.style.cssText = `
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #fff;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        `;

        // Match Type Indicator
        const matchTypeIndicator = document.createElement('div');
        const matchTypeText = getMatchTypeDisplayText(matchType);
        const matchTypeColor = getMatchTypeColor(matchType);
        matchTypeIndicator.textContent = matchTypeText;
        matchTypeIndicator.style.cssText = `
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 2rem;
            color: ${matchTypeColor};
            text-shadow: 0 0 10px ${matchTypeColor};
            animation: glow 2s ease-in-out infinite;
            letter-spacing: 2px;
        `;

        // Player vs Opponent
        const matchup = document.createElement('div');
        matchup.style.cssText = `
            font-size: 2rem;
            margin-bottom: 2rem;
            color: #fff;
        `;

        const playerSpan = document.createElement('span');
        playerSpan.textContent = currentPlayerName;
        playerSpan.style.cssText = `
            color: #4ade80;
            font-weight: bold;
        `;

        const vsSpan = document.createElement('span');
        vsSpan.textContent = ' VS ';
        vsSpan.style.cssText = `
            color: #fff;
            margin: 0 1rem;
            font-weight: normal;
        `;

        const opponentSpan = document.createElement('span');
        opponentSpan.textContent = opponentName;
        opponentSpan.style.cssText = `
            color: #f87171;
            font-weight: bold;
        `;

        matchup.appendChild(playerSpan);
        matchup.appendChild(vsSpan);
        matchup.appendChild(opponentSpan);

        // Countdown or loading indicator
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Get Ready...';
        loadingText.style.cssText = `
            font-size: 1.5rem;
            color: #9ca3af;
            animation: pulse 1.5s infinite;
        `;

        // Assemble splash content
        splashContent.appendChild(title);
        splashContent.appendChild(matchTypeIndicator);
        splashContent.appendChild(matchup);
        splashContent.appendChild(loadingText);
        splashOverlay.appendChild(splashContent);

        // Add to DOM
        document.body.appendChild(splashOverlay);

        // Remove splash screen after duration
        currentSplashScreenTimeout = setTimeout(() => {
            // Fade out animation
            splashOverlay.style.animation = 'fadeOut 0.5s ease-in-out';
            
            setTimeout(() => {
                // Remove from DOM
                if (splashOverlay.parentNode) {
                    splashOverlay.parentNode.removeChild(splashOverlay);
                }
                // Remove styles
                if (styleSheet.parentNode) {
                    styleSheet.parentNode.removeChild(styleSheet);
                }
                
                // Clean up references
                currentSplashScreenPromise = null;
                currentSplashScreenResolve = null;
                currentSplashScreenTimeout = null;
        
                resolve();
            }, 500); // Wait for fade out animation
        }, duration);
    });
}

/**
 * Remove splash screen immediately if it exists
 */
export function removeSplashScreen(): void {
    const splashScreen = document.getElementById('game-splash-screen');
    if (splashScreen && splashScreen.parentNode) {
        splashScreen.parentNode.removeChild(splashScreen);
    }
    
    // Remove any associated styles
    const styleSheets = document.querySelectorAll('style');
    styleSheets.forEach(style => {
        if (style.textContent && style.textContent.includes('fadeIn') && style.textContent.includes('slideInUp')) {
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }
    });
    
    // Clear timeout and resolve promise if it exists
    if (currentSplashScreenTimeout) {
        clearTimeout(currentSplashScreenTimeout);
        currentSplashScreenTimeout = null;
    }
    
    if (currentSplashScreenResolve) {
        currentSplashScreenResolve();
        currentSplashScreenResolve = null;
    }
    
    currentSplashScreenPromise = null;
    
    console.log('🧹 Splash screen removed immediately');
}

/**
 * Check if a splash screen is currently active
 */
export function isSplashScreenActive(): boolean {
    return currentSplashScreenPromise !== null;
} 