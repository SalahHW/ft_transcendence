import { playerPaddle } from '../player/player.js';
import { gameMap } from '../map/gameMap.js';
import { webSocketClient } from '../webSocketClient/webSocketClient.js';
import { webSocketClientDisconnect, leaveGame as disconnectLeaveGame, cleanup as disconnectCleanup } from '../webSocketClient/webSocketClientDisconnect.js';
import { stateTracker } from '../webSocketClient/StateTracker.js';
import { browserEventHandler } from '../webSocketClient/BrowserEventHandler.js';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { fetchWithSelfSigned } from '../utils/fetch.js';
import { updatePlayerNames, updateScoresUI, updateScoresUIVersus, updatePlayerNamesVersus, updateGameStatus, updatePowerUpStatus } from '../playerUi/playerUi.js';
import { handleWaitingForPlayers, stopForfeitWinnerPing } from '../ui/waitingStatusHandler.js';
import { soundManager } from '../audio/soundManager.js';
import { showSplashScreen } from '../ui/splashScreen.js';
// GameEndData interface will be imported dynamically
import { cameraManager } from '../camera/cameraManager.js';
import { PlayerPowerup } from '../player/playerPowerup.js';

interface PlayerData {
    id: string;
    readyToPlay: boolean;
    [key: string]: any;
}

interface ApiResponse {
    data: PlayerData[];
}

const serverPort = 8081; // Game service port (WebSocket and API)
let clientConnection: webSocketClient | null = null;
let map: gameMap | null = null;
let player1: playerPaddle | null = null;
let player2: playerPaddle | null = null;
let ball: Ball | null = null;
let roomId: string | null = null;
let localPlayerId: string | null = null;
let isUpPressed: boolean = false;
let isDownPressed: boolean = false;
let lastBallPosition: BABYLON.Vector3 | null = null;
let lastSyncTime: number | null = null;
let predictedPosition: BABYLON.Vector3 | null = null;
let ping: number = 0;
let pingSamples: number[] = [];
let isGameOver: boolean = false;
let matchEndTime: Date | null = null;
let initTime: number | null = null;
let syncCount: number = 0;
let ballUpdateReceived: boolean = false;
let isGameLoopRunning: boolean = false;

// ⭐ POWERUP INTEGRATION: Add powerup UI instances
let player1Powerup: PlayerPowerup | null = null;
let player2Powerup: PlayerPowerup | null = null;

// Function to handle sound events
function handleSoundEvent(msg: any): void {
    const { sound, ballSpeed, rebounds } = msg;
    let volumeMultiplier = 0;
    
    switch (sound) {
        case 'paddleHit':
            // Vary volume based on ball speed for more immersion
            volumeMultiplier = Math.min(1, (ballSpeed || 25) / 50);
            soundManager.playSound('paddleHit', volumeMultiplier);
            break;
            
        case 'powerUpHit':
            soundManager.playSound('powerUpHit', 1.0);
            break;
            
        case 'defensivePowerUp':
            soundManager.playSound('defensivePowerUp', 1.0);
            break;
            
        case 'wallHit':
            volumeMultiplier = Math.min(1, (ballSpeed || 25) / 50);
            soundManager.playSound('wallHit', volumeMultiplier);
            break;
            
        case 'lostPoint':
            soundManager.playSound('lostPoint', 1.0);
            break;
        case 'playerScored':
            soundManager.playSound('playerScored', 1.0);
            break;
        default:
            console.warn('Unknown sound event:', sound);
    }
}

// Function to check available players
async function checkAvailablePlayers(): Promise<PlayerData[]> {
    try {
        const gameApiUrl = `${window.location.protocol}//${window.location.host}/api/game/players`;
        const response = await fetchWithSelfSigned(gameApiUrl, {
            method: 'GET',
        });
        
        const result: ApiResponse = await response.json();
        if (!result.data || !Array.isArray(result.data)) {
            throw new Error('Invalid response format from server');
        }
        
        return result.data;
    } catch (error) {
        console.error('Error checking players:', error);
        throw error;
    }
}

// Function to set player ready status
async function setPlayerReady(playerId: string): Promise<boolean> {
    try {
        const gameApiUrl = `${window.location.protocol}//${window.location.host}/api/game/players/${playerId}/ready`;
        const response = await fetchWithSelfSigned(gameApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({}),
        });
        
        if (!response.ok) {
            throw new Error('Failed to set player ready status');
        }
        
        return true;
    } catch (error) {
        console.error('Error setting player ready:', error);
        throw error;
    }
}

// Function to initialize the game
export function initializeGame(playerId: string, gameType: '1v1' | 'tournament' = '1v1'): void {
    console.log(`🎮 Initializing game for player ${playerId} with game type: ${gameType}`);
    
    // If tournament mode, just log and return without starting 1v1 game logic
    if (gameType === 'tournament') {
        console.log('🏆 Tournament mode detected - skipping 1v1 game initialization');
        console.log('🏆 Tournament logic will be implemented later');
        updateGameStatus('Tournament mode - waiting for implementation');
        return;
    }
    
    if (clientConnection) {
        clientConnection.socket.close();
    }
    isGameOver = false;
    isGameLoopRunning = false;
    localPlayerId = playerId;
    
    // Reset cleanup flags for new game session
    webSocketClientDisconnect.resetCleanupFlag();
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/game/ws`;
    clientConnection = new webSocketClient(wsUrl, playerId);
    
    // Make leaveGame function available globally for Leave Game button
    (window as any).leaveGame = leaveGame;
    (window as any).clientConnection = clientConnection;
    


    clientConnection.socket.addEventListener('open', () => {
        updateGameStatus('Connected to game server');
        
        // Initialize state tracking and browser event handling AFTER connection is established
        console.log('🌐 WebSocket connection opened, initializing disconnect handlers');
        if (clientConnection) {
            stateTracker.initialize(clientConnection, playerId, 'waiting'); // Temporary room ID
            browserEventHandler.initialize(clientConnection, playerId, 'waiting'); // Temporary room ID
        }
    });

    clientConnection.socket.addEventListener('error', err => {
        console.error('WebSocket error:', err);
        updateGameStatus('Connection error');
    });
    
    // Update the disconnect handler with current game state
    webSocketClientDisconnect.updateGameState({
        isGameOver,
        isGameLoopRunning,
        map,
        clientConnection,
        player1,
        player2,
        ball,
        roomId,
        localPlayerId,
        isUpPressed,
        isDownPressed
    });

    // Set up paddle movement handler
    clientConnection.onPaddleMove((msg) => {
        if (!player1 || !player2) return;
        const movingPlayer = msg.playerId === player1.getPlayerId() ? player1 : player2;
        if (movingPlayer) {
            movingPlayer.setZ(msg.positionZ || 0);
        }
    });

    // Set up sound event handler
    clientConnection.onSoundEvent((msg) => {
        handleSoundEvent(msg);
    });

    // Add ball update handler
    clientConnection.onBallUpdate((msg) => {
        if (!ball) return;
        if (msg.ballState?.isRespawning || msg.isInitialSpawn || msg.isScoreRespawn) {
            if (ball.ballBody) {
                ball.ballBody.isVisible = true;
            }
        }
        if (msg.ballState) {
            ball.setState(msg.ballState);
        }
        
        // Update state to playing when ball is active
        if (msg.ballState && !msg.ballState.isRespawning) {
            stateTracker.setPlayingState();
        }
    });

    // Add sync handler
    clientConnection.onSync((msg) => {
        if (!player1 || !player2) return;
        
        if (msg.playerPositions) {
            Object.entries(msg.playerPositions).forEach(([playerId, positionZ]) => {
                const syncPlayer = playerId === player1!.getPlayerId() ? player1 : player2;
                if (syncPlayer && syncPlayer.getPlayerId() !== localPlayerId) {
                    syncPlayer.setZ(positionZ);
                }
            });
        }
        
        if (msg.ballState && ball) {
            ball.setState(msg.ballState);
            lastSyncTime = typeof msg.serverTime === 'number' ? msg.serverTime : Date.now();
        }
    });

    // Add score update handler with camera shake for losing player
    let previousScores: { [key: string]: number } = {};
    clientConnection.onScoreUpdate((msg) => {
        if (!player1 || !player2 || !map || !msg.scores) return;
        const currentScores = msg.scores;
        if (Object.keys(previousScores).length === 0) {
            Object.keys(currentScores).forEach(playerId => {
                previousScores[playerId] = 0;
            });
        }
        let losingPlayerId: string | null = null;
        
        for (const [playerId, currentScore] of Object.entries(currentScores)) {
            const previousScore = previousScores[playerId] || 0;
            if (currentScore > previousScore) {
                const otherPlayerId = Object.keys(currentScores).find(id => id !== playerId);
                losingPlayerId = otherPlayerId || null;
                break;
            }
        }
        
        if (losingPlayerId === localPlayerId) {
            cameraManager.triggerCameraShake().catch(error => {
                console.error('Camera shake failed:', error);
            });
        }
        previousScores = { ...currentScores };
        
        if (player1 && player2) {
            const player1Score = currentScores[player1.getPlayerId()] || 0;
            const player2Score = currentScores[player2.getPlayerId()] || 0;
            player1.playerScore = player1Score;
            player2.playerScore = player2Score;
            
            const currentPlayer = localPlayerId === player1.getPlayerId() ? player1 : player2;
            const opponent = localPlayerId === player1.getPlayerId() ? player2 : player1;
            const currentPlayerScore = currentScores[currentPlayer.getPlayerId()] || 0;
            const opponentScore = currentScores[opponent.getPlayerId()] || 0;
            
            updateScoresUIVersus(currentPlayerScore, opponentScore, currentPlayer.playerName, opponent.playerName);
        }
    });

    // Add game end handler - simplified for 1v1 only
    clientConnection.onGameEnd(async (msg: any) => {
        const gameEndData = msg;
        isGameOver = true;
        
        // Update state to game over
        stateTracker.setGameOverState();
        
        // Stop the game loop and clean up
        if (isGameLoopRunning && map?.getEngine) {
            map.getEngine.stopRenderLoop();
            isGameLoopRunning = false;
        }
        
        // ⭐ FIX: Dispose ball assets before showing splash screen
        if (ball && !ball.isDisposed) {
            console.log('🧹 1v1: Disposing ball assets at game end');
            ball.dispose();
        }
        
        // Show regular 1v1 game end splash screen
        const { showGameEndSplashScreen } = await import('../utils/splashScreenUtils.js');
        await showGameEndSplashScreen(gameEndData, localPlayerId);
        cleanup();
    });

    // Handle waiting status messages
    clientConnection.socket.addEventListener('message', async (event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'waitingForPlayers') {
                console.log('CLIENT: Received waitingForPlayers message:', message);
                handleWaitingForPlayers(message, updateGameStatus);
                
                // Update state to waiting
                stateTracker.setWaitingState();
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    // Add powerup message handlers
    clientConnection.onPowerupStateUpdate((msg) => {
        if (msg.powerupStates && player1 && player2) {
            Object.entries(msg.powerupStates).forEach(([pid, state]: [string, any]) => {
                if (pid === player1!.playerId && player1Powerup) {
                    player1Powerup.updateState(state);
                } else if (pid === player2!.playerId && player2Powerup) {
                    player2Powerup.updateState(state);
                }
            });
            
            // ⭐ NEW: Update HTML powerUp status based on local player's state
            const localPlayerPowerup = player1Powerup || player2Powerup;
            if (localPlayerPowerup) {
                const isFPSMode = cameraManager.isInFPSMode();
                const powerUpState = {
                    isAvailable: localPlayerPowerup.isAvailable,
                    isActive: localPlayerPowerup.isActive,
                    remainingCooldown: localPlayerPowerup.remainingCooldown,
                    windowTimeLeft: localPlayerPowerup.windowTimeLeft
                };
                updatePowerUpStatus(isFPSMode, powerUpState);
            }
        }
    });

    clientConnection.onPowerupActivated((msg) => {
        
        const isDefensive = msg.powerupType === 'defensive';
        
        if (msg.playerId && player1 && player2) {
            if (msg.playerId === player1.playerId && player1Powerup) {
                if (isDefensive) {
                    player1Powerup.showDefensiveSuccessFeedback();
                } else {
                    player1Powerup.showSuccessFeedback();
                }
            } else if (msg.playerId === player2.playerId && player2Powerup) {
                if (isDefensive) {
                    player2Powerup.showDefensiveSuccessFeedback();
                } else {
                    player2Powerup.showSuccessFeedback();
                }
            }
            
            if (map && map.getScene) {
                cameraManager.triggerCameraShake().then(() => {
                    // Screen shake completed
                }).catch(() => {
                    // Screen shake failed, but that's okay
                });
            }
        }
        
        if (ball && ball.ballPowerup) {
            ball.ballPowerup.updateState({
                isSpeedBoosted: true,
                speedMultiplier: msg.ballSpeedMultiplier || 2.0,
                activatedByPlayer: msg.playerId || null,
                originalSpeed: msg.originalSpeed || 0,
                isDefensive: isDefensive,
                stackedSpeed: msg.stackedSpeed
            });
        }
    });

    clientConnection.onPowerupDeactivated((msg) => {
        
        if (ball && ball.ballPowerup) {
            ball.ballPowerup.updateState({
                isSpeedBoosted: false,
                speedMultiplier: 1.0,
                activatedByPlayer: null,
                originalSpeed: 0
            });
        }
    });

    clientConnection.onBallTraversal((msg) => {
        // Handle visual feedback for ball traversal
    });

    clientConnection.onResetPlayerStates((msg) => {
        // Reset any client-side player state tracking
    });

    clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId, playerName, opponentName, playerPositionZ, opponentPositionZ }) => {
        console.log('🎮 Game init received:', { playerId, roomId: rId, role, opponentId, playerName, opponentName });
        
        initTime = Date.now();
        roomId = rId || null;
        localPlayerId = playerId || null;

        // Update state tracker and browser event handler with actual room ID
        if (roomId) {
            stateTracker.updateRoomId(roomId);
            browserEventHandler.updateRoomId(roomId);
            console.log(`🔄 Updated disconnect handlers with room ID: ${roomId}`);
        }

        stopForfeitWinnerPing();

        isGameOver = false;
        isGameLoopRunning = false;
        
        // Get player names for splash screen
        const currentPlayerName = playerName || 'You';
        const opponentDisplayName = opponentName || 'Opponent';
        
        // 🎬 Show splash screen BEFORE creating any game elements
        updateGameStatus('Preparing match...');
        
        try {
            // Show splash screen for 3 seconds with VERSUS match type
            const { showSplashScreen, MatchType } = await import('../ui/splashScreen.js');
            await showSplashScreen(currentPlayerName, opponentDisplayName, 3000, MatchType.VERSUS);
        } catch (error) {
            console.error('Error showing splash screen:', error);
            // Continue with game initialization even if splash screen fails
        }
        
        // NOW create the game elements AFTER splash screen
        
        // ⭐ FIX: Always recreate map for new game session
        try {
            // Dispose of existing map if it exists
            if (map) {
                map.dispose();
            }
            
            map = new gameMap();
            map.createMap();
            map.createPlayground();
            if (!map.getScene) {
                throw new Error('map.getScene is undefined');
            }
        } catch (e) {
            console.error('Map creation failed:', e);
            updateGameStatus('Error: Failed to create game map');
            return;
        }

        // ⭐ FIX: Always recreate players for new game session
        if (!playerId || !opponentId) {
            console.error('Missing player IDs');
            return;
        }
        
        // Clear existing players (they don't have dispose method)
        if (player1) {
            player1 = null;
        }
        if (player2) {
            player2 = null;
        }
        
        const player1Name = role === 0 ? playerName : opponentName;
        const player2Name = role === 0 ? opponentName : playerName;
        
        if (role === 0) {
            player1 = new playerPaddle(player1Name, playerId, 0);
            player2 = new playerPaddle(player2Name, opponentId, 1);
        } else {
            player1 = new playerPaddle(player1Name, opponentId, 0);
            player2 = new playerPaddle(player2Name, playerId, 1);
        }

        try {
            player1.createPaddle(map.getScene!, 19.5, 2, 20);
            player2.createPaddle(map.getScene!, -19.5, 2, 20);
            
            // ⭐ FIX: Use server-provided initial positions to ensure synchronization
            const player1PositionZ = playerPositionZ || 0;
            const player2PositionZ = opponentPositionZ || 0;
            
            // Set paddle positions based on server data
            player1.setZ(player1PositionZ);
            player2.setZ(player2PositionZ);
            
            console.log(`🎮 Set initial paddle positions: player1=${player1PositionZ}, player2=${player2PositionZ}`);
            
            // ⭐ REMOVED: PowerUp creation moved to after animation completion
            // This ensures the 3D powerUp UI is not visible during the launch animation
        } catch (e) {
            console.error('Paddle creation failed:', e);
            return;
        }

        // ⭐ FIX: Always recreate ball for new game session
        try {
            // Dispose of existing ball if it exists
            if (ball) {
                ball.dispose();
            }
            
            ball = new Ball(player1, player2);
            ball.createBall(map.getScene!);
            if (ball.ballBody) {
                ball.ballBody.metadata = { roomId };
                ball.ballBody.position = new BABYLON.Vector3(0, -2, 0);
                ball.ballBody.isVisible = true;
            }
            ball.position = new BABYLON.Vector3(0, -2, 0);
            ball.isRespawning = true;
            ball.respawnTime = 0;
            ball.hasValidPosition = true;
            
            // ⭐ FIX: Remove early ball respawn request - will be sent after animation completes
            console.log('Ball created, waiting for animation to complete before requesting respawn');
            
            // Update state to playing when ball spawns
            stateTracker.setPlayingState();
        } catch (e) {
            console.error('Ball creation failed:', e);
            return;
        }

        // Ensure all elements are visible
        if (player1?.paddleBody) {
            player1.paddleBody.isVisible = true;
        }
        if (player2?.paddleBody) {
            player2.paddleBody.isVisible = true;
        }
        if (ball?.ballBody) {
            ball.ballBody.isVisible = true;
        }

        // Initialize camera manager
        if (map && player1 && player2 && localPlayerId) {
            cameraManager.initialize(map, player1, player2, localPlayerId);
        }

        updateGameStatus('Game starting...');
        
        // Update state to launch animation
        stateTracker.setLaunchAnimationState();
        
        soundManager.preloadSounds().catch(error => {
            console.warn('Failed to initialize sound manager:', error);
        });
        updateScoresUIVersus(0, 0, player1Name, player2Name);
        updatePlayerNamesVersus(playerName || 'Player', opponentName || 'Opponent');
        
        // ⭐ FIX: Set up keyboard controls for 1v1 mode
        setupKeyboardControls();
        
        // Start the game loop after match animation
        if (!isGameLoopRunning) {
            try {
                await map.launchMatchAnimation();
                
                // Re-enforce visibility after animation completes
                if (player1?.paddleBody) {
                    player1.paddleBody.isVisible = true;
                }
                if (player2?.paddleBody) {
                    player2.paddleBody.isVisible = true;
                }
                if (ball?.ballBody) {
                    ball.ballBody.isVisible = true;
                }

                cameraManager.switchToFPSAfterAnimation();
                
                // ⭐ NEW: Create powerUp UI for local player only after animation and FPS camera switch
                if (map?.getScene && player1 && player2 && localPlayerId) {
                    const isLocalPlayer1 = player1.playerId === localPlayerId;
                    if (isLocalPlayer1) {
                        player1Powerup = new PlayerPowerup(player1.playerId, map.getScene, 0);
                        player1Powerup.showPowerUpUI();
                        player2Powerup = null;
                    } else {
                        player1Powerup = null;
                        player2Powerup = new PlayerPowerup(player2.playerId, map.getScene, 1);
                        player2Powerup.showPowerUpUI();
                    }
                }
                
                // ⭐ FIX: Only send animationComplete - server will handle ball spawning when both players are ready
                if (clientConnection) {
                    clientConnection.send({
                        type: 'animationComplete',
                        playerId: localPlayerId
                    });
                }
                
                setupGameLoop();
            } catch (e) {
                console.error('Error during game initialization:', e);
                
                if (player1?.paddleBody) {
                    player1.paddleBody.isVisible = true;
                }
                if (player2?.paddleBody) {
                    player2.paddleBody.isVisible = true;
                }
                if (ball?.ballBody) {
                    ball.ballBody.isVisible = true;
                }
                
                // ⭐ NEW: Create powerUp UI even if animation fails (FPS camera should still be active)
                if (map?.getScene && player1 && player2 && localPlayerId) {
                    const isLocalPlayer1 = player1.playerId === localPlayerId;
                    if (isLocalPlayer1) {
                        player1Powerup = new PlayerPowerup(player1.playerId, map.getScene, 0);
                        player1Powerup.showPowerUpUI();
                        player2Powerup = null;
                    } else {
                        player1Powerup = null;
                        player2Powerup = new PlayerPowerup(player2.playerId, map.getScene, 1);
                        player2Powerup.showPowerUpUI();
                    }
                }
                
                // ⭐ FIX: Only send animationComplete - server will handle ball spawning when both players are ready
                if (clientConnection) {
                    clientConnection.send({
                        type: 'animationComplete',
                        playerId: localPlayerId
                    });
                }
                setupGameLoop();
            }
        }
    });
}

// Export cleanup function for Leave Game button
export function cleanup(): void {
    stopForfeitWinnerPing();
    (window as any).clientConnection = null;

    // ✅ FIX: Clean up 1v1 keyboard event listeners that conflict with tournament mode
    if ((window as any).gameKeydownHandler) {
        document.removeEventListener('keydown', (window as any).gameKeydownHandler);
        delete (window as any).gameKeydownHandler;
        console.log('⌨️ 1v1 Keydown event listener removed');
    }
    
    if ((window as any).gameKeyupHandler) {
        document.removeEventListener('keyup', (window as any).gameKeyupHandler);
        delete (window as any).gameKeyupHandler;
        console.log('⌨️ 1v1 Keyup event listener removed');
    }
    
    // Reset game control flags
    (window as any).gameControlsInitialized = false;

    webSocketClientDisconnect.updateGameState({
        isGameOver,
        isGameLoopRunning,
        map,
        clientConnection,
        player1,
        player2,
        ball,
        roomId,
        localPlayerId,
        isUpPressed,
        isDownPressed
    });
    
    disconnectCleanup();
    stateTracker.cleanup();
    browserEventHandler.cleanup();
    cameraManager.dispose();
    
    // ⭐ FIX: Properly dispose ball assets before cleanup
    if (ball && !ball.isDisposed) {
        console.log('🧹 1v1: Disposing ball assets during cleanup');
        ball.dispose();
    }
    
    // ⭐ FIX: Dispose map assets
    if (map && map.dispose) {
        console.log('🧹 1v1: Disposing map assets during cleanup');
        map.dispose();
    }
    
    isGameOver = true;
    isGameLoopRunning = false;
    clientConnection = null;
    player1 = null;
    player2 = null;
    ball = null;
    map = null;
    roomId = null;
    localPlayerId = null;
    isUpPressed = false;
    isDownPressed = false;
}

// Export leaveGame function for Leave Game button
export function leaveGame(): void {
    stopForfeitWinnerPing();
    (window as any).clientConnection = null;

    // ✅ FIX: Clean up 1v1 keyboard event listeners that conflict with tournament mode
    if ((window as any).gameKeydownHandler) {
        document.removeEventListener('keydown', (window as any).gameKeydownHandler);
        delete (window as any).gameKeydownHandler;
        console.log('⌨️ 1v1 Keydown event listener removed');
    }
    
    if ((window as any).gameKeyupHandler) {
        document.removeEventListener('keyup', (window as any).gameKeyupHandler);
        delete (window as any).gameKeyupHandler;
        console.log('⌨️ 1v1 Keyup event listener removed');
    }
    
    // Reset game control flags
    (window as any).gameControlsInitialized = false;

    webSocketClientDisconnect.updateGameState({
        isGameOver,
        isGameLoopRunning,
        map,
        clientConnection,
        player1,
        player2,
        ball,
        roomId,
        localPlayerId,
        isUpPressed,
        isDownPressed
    });
    
    disconnectLeaveGame();
    stateTracker.cleanup();
    browserEventHandler.cleanup();
    cameraManager.dispose();
    
    // ⭐ FIX: Properly dispose ball assets before leaving game
    if (ball && !ball.isDisposed) {
        ball.dispose();
    }
    
    // ⭐ FIX: Dispose map assets
    if (map && map.dispose) {
        map.dispose();
    }
    
    isGameOver = true;
    isGameLoopRunning = false;
    clientConnection = null;
    player1 = null;
    player2 = null;
    ball = null;
    map = null;
    roomId = null;
    localPlayerId = null;
    isUpPressed = false;
    isDownPressed = false;
}

// Function to setup keyboard controls for 1v1 mode
function setupKeyboardControls(): void {
    // ⭐ FIX: Prevent multiple keyboard handler initialization
    if ((window as any).gameControlsInitialized) {
        console.log('⌨️ 1v1: Keyboard controls already initialized, skipping');
        return;
    }

    // ⭐ FIX: Create keyboard handlers for 1v1 mode
    const keydownHandler = (event: KeyboardEvent) => {
        // ⭐ CRITICAL: Only process input when game is actually playing
        if (isGameOver || !clientConnection) {
            console.log('⌨️ 1v1: Input blocked: game not ready for input', {
                isGameOver,
                hasConnection: !!clientConnection
            });
            return;
        }
        
        // ⭐ NEW: Add debug logging for successful input
        console.log('⌨️ 1v1: Processing keydown:', event.key, {
            isGameOver,
            hasConnection: !!clientConnection
        });
        
        // 🎮 FIX: Use perspective-aware control mapping for FPS mode
        const shouldInvert = cameraManager.shouldInvertControls();
        
        if (event.key === 'ArrowLeft') {
            const direction = shouldInvert ? 'down' : 'up';
            
            if (direction === 'up' && !isUpPressed) {
                isUpPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'up' });
                console.log('⌨️ 1v1: Sent keyDown up');
            } else if (direction === 'down' && !isDownPressed) {
                isDownPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'down' });
                console.log('⌨️ 1v1: Sent keyDown down');
            }
        } else if (event.key === 'ArrowRight') {
            const direction = shouldInvert ? 'up' : 'down';
            
            if (direction === 'up' && !isUpPressed) {
                isUpPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'up' });
                console.log('⌨️ 1v1: Sent keyDown up');
            } else if (direction === 'down' && !isDownPressed) {
                isDownPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'down' });
                console.log('⌨️ 1v1: Sent keyDown down');
            }
        } else if (event.key === 'A' || event.key === 'a') {
            // ⭐ POWERUP: Activate power-up when A key is pressed
            console.log('⌨️ 1v1: Power-up activation requested');
            clientConnection.activatePowerup();
        }
    };

    const keyupHandler = (event: KeyboardEvent) => {
        // ⭐ CRITICAL: Only process input when game is actually playing
        if (isGameOver || !clientConnection) {
            return;
        }
        
        const shouldInvert = cameraManager.shouldInvertControls();
        
        if (event.key === 'ArrowLeft') {
            const direction = shouldInvert ? 'down' : 'up';
            
            if (direction === 'up' && isUpPressed) {
                isUpPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'up' });
            } else if (direction === 'down' && isDownPressed) {
                isDownPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'down' });
            }
        } else if (event.key === 'ArrowRight') {
            const direction = shouldInvert ? 'up' : 'down';
            
            if (direction === 'up' && isUpPressed) {
                isUpPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'up' });
            } else if (direction === 'down' && isDownPressed) {
                isDownPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'down' });
            }
        }
    };

    // ⭐ FIX: Store handlers globally for proper cleanup
    (window as any).gameKeydownHandler = keydownHandler;
    (window as any).gameKeyupHandler = keyupHandler;
    (window as any).gameControlsInitialized = true;

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    
    console.log('⌨️ 1v1: Keyboard controls initialized');
    
    // ⭐ NEW: Test keyboard event listener attachment
    console.log('⌨️ 1v1: Testing keyboard event listener attachment...');
    const testEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    document.dispatchEvent(testEvent);
}

// Function to setup game loop
function setupGameLoop(): void {
    if (isGameLoopRunning) {
        return;
    }

    let frameCount = 0;
    let lastTime = Date.now();
    let lastPaddleUpdate = Date.now();
    const PADDLE_UPDATE_INTERVAL = 1000 / 60; // 60 updates per second
    
    const renderLoop = () => {
        if (isGameOver) {
            if (map && map.getEngine) {
                map.getEngine.stopRenderLoop();
            }
            isGameLoopRunning = false;
            return;
        }

        frameCount++;
        const now = Date.now();
        if (now - lastTime >= 1000) {
            frameCount = 0;
            lastTime = now;
        }

        const deltaTime = map && map.getEngine ? map.getEngine.getDeltaTime() / 1000 : 0;
        
        // Handle player movement
        if (player1 && player2 && localPlayerId) {
            const localPlayer = player1.getPlayerId() === localPlayerId ? player1 : player2;

            // ⭐ FIX: Remove broken paddle position updates - use keyDown/keyUp system only
            // This prevents network spam and ensures consistent behavior across game modes
            if (isUpPressed && !isDownPressed) {
                localPlayer.move(-1, deltaTime);
            } else if (isDownPressed && !isUpPressed) {
                localPlayer.move(1, deltaTime);
            }
        }

        // Update camera system
        cameraManager.update();

        // Update local player's powerup UI position to stay as HUD
        if (player1Powerup) {
            player1Powerup.updateCameraPosition();
        }
        if (player2Powerup) {
            player2Powerup.updateCameraPosition();
        }

        // ⭐ NEW: Update HTML powerUp status based on camera mode and local player's powerUp state
        const localPlayerPowerup = player1Powerup || player2Powerup;
        if (localPlayerPowerup) {
            const isFPSMode = cameraManager.isInFPSMode();
            const powerUpState = {
                isAvailable: localPlayerPowerup.isAvailable,
                isActive: localPlayerPowerup.isActive,
                remainingCooldown: localPlayerPowerup.remainingCooldown,
                windowTimeLeft: localPlayerPowerup.windowTimeLeft
            };
            updatePowerUpStatus(isFPSMode, powerUpState);
        }

        // Update ball position and ensure it's visible
        if (ball && ball.ballBody && map && map.getScene) {
            ball.updateClient(map.getScene);
        }

        // Ensure scene renders
        if (map && map.getScene) {
            map.getScene.render();
        }
    };

    // Start the render loop
    if (map && map.getEngine) {
        map.getEngine.runRenderLoop(renderLoop);
        isGameLoopRunning = true;
        
        // Update state to playing
        stateTracker.setPlayingState();
    } else {
        console.error('Failed to start game loop: map or engine not initialized');
    }
}

// Export function to setup join game button
export function setupJoinGameButton(gameType: '1v1' | 'tournament' = '1v1'): void {
    if ((window as any).joinGameButtonSetup) {
        return;
    }
    
    const joinGameBtn = document.getElementById('joinGameBtn') as HTMLButtonElement;
    
    if (joinGameBtn) {
        const clickHandler = async () => {
            joinGameBtn.disabled = true;
            updateGameStatus('Checking for available players...');
            
            try {
                const players = await checkAvailablePlayers();
                if (players.length < 2) {
                    updateGameStatus('Not enough players registered. Please wait for more players.');
                    joinGameBtn.disabled = false;
                    return;
                }
                const availablePlayers = players.filter(p => !p.readyToPlay);
                if (availablePlayers.length === 0) {
                    updateGameStatus('All players are already in game. Please wait.');
                    joinGameBtn.disabled = false;
                    return;
                }
                const playerId = availablePlayers[0].id;
                updateGameStatus('Joining game...');
                
                initializeGame(playerId, gameType);
                
                await setPlayerReady(playerId);
                updateGameStatus('Waiting for other player to join...');

            } catch (error) {
                console.error('Error joining game:', error);
                updateGameStatus('Error joining game. Please try again.');
                joinGameBtn.disabled = false;
            }
        };
        
        joinGameBtn.addEventListener('click', clickHandler);
        
        (window as any).joinGameButtonHandler = clickHandler;
        (window as any).joinGameButtonSetup = true;
    }
} 