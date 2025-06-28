import { playerPaddle } from '../player/player.js';
import { gameMap } from '../map/gameMap.js';
import { webSocketClient } from '../webSocketClient/webSocketClient.js';
import { webSocketClientDisconnect, leaveGame as disconnectLeaveGame, cleanup as disconnectCleanup } from '../webSocketClient/webSocketClientDisconnect.js';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { fetchWithSelfSigned } from '../utils/fetch.js';
import { updatePlayerNames, updateScoresUI, updateScoresUIVersus, updatePlayerNamesVersus, updateGameStatus } from '../playerUi/playerUi.js';
import { handleWaitingForPlayers } from '../ui/waitingStatusHandler.js';
import { soundManager } from '../audio/soundManager.js';
import { TournamentClientHandler } from '../tournament/tournamentClientHandler.js';
import { showSplashScreen } from '../ui/splashScreen.js';
import { showGameEndSplashScreen, GameEndData } from '../utils/splashScreenUtils.js';
import { cameraManager } from '../camera/cameraManager.js';

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
let isShowingSemiFinalSplash: boolean = false;
let queuedMessages: any[] = [];

// Function to process queued messages after semi-final splash
async function processQueuedMessages(): Promise<void> {
    while (queuedMessages.length > 0) {
        const message = queuedMessages.shift();
        if (message.type === 'waitingForPlayers') {
            handleWaitingForPlayers(message, updateGameStatus);
        }         
        // Small delay between processing messages to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

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
        case 'semiFinalWin':
            soundManager.playSound('semiFinalWin', 1.0);
            break;
        case 'semiFinalLose':
            soundManager.playSound('semiFinalLose', 1.0);
            break;
        case 'firstPlace':
            soundManager.playSound('firstPlace', 1.0);
            break;
        case 'secondPlace':
            soundManager.playSound('secondPlace', 1.0);
            break;
        case 'thirdPlace':
            soundManager.playSound('thirdPlace', 1.0);
            break;
        case 'fourthPlace':
            soundManager.playSound('fourthPlace', 1.0);
            break;
        default:
            console.warn('Unknown sound event:', sound);
    }
}



// Function to check available players
async function checkAvailablePlayers(): Promise<PlayerData[]> {
    try {
        // FIXED: Use current domain instead of localhost for game service API
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
        // FIXED: Use current domain instead of localhost for game service API
        const gameApiUrl = `${window.location.protocol}//${window.location.host}/api/game/players/${playerId}/ready`;
        const response = await fetchWithSelfSigned(gameApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),  // Send empty object as body
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
export function initializeGame(playerId: string): void {
    if (clientConnection) {
        clientConnection.socket.close();
    }
    isGameOver = false;
    isGameLoopRunning = false;
    localPlayerId = playerId;
    // FIXED: Use current domain instead of localhost for WebSocket connection
    // Dynamically determine protocol (ws:// for HTTP, wss:// for HTTPS)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/game/ws`;
    clientConnection = new webSocketClient(wsUrl, playerId);
    
    // Make leaveGame function available globally for Leave Game button
    (window as any).leaveGame = leaveGame;

    clientConnection.socket.addEventListener('open', () => {
        updateGameStatus('Connected to game server');
    });

    clientConnection.socket.addEventListener('error', err => {
        console.error('WebSocket error:', err);
        updateGameStatus('Connection error');
    });

    // Setup disconnection handlers using the dedicated module
    webSocketClientDisconnect.setupWebSocketDisconnectionHandlers(clientConnection);
    
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
            // Always update paddle position from server (for HTTP commands and sync)
            movingPlayer.setZ(msg.positionZ || 0);
        }
    });

    // 🔊 Set up sound event handler
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
    });

    // Add sync handler to ensure positions are correct
    clientConnection.onSync((msg) => {
        if (!player1 || !player2) return;
        if (msg.playerPositions) {
            Object.entries(msg.playerPositions).forEach(([playerId, positionZ]) => {
                const syncPlayer = playerId === player1!.getPlayerId() ? player1 : player2;
                if (syncPlayer) {
                    // Always sync paddle positions from server (important for HTTP commands)
                    syncPlayer.setZ(positionZ);
                }
            });
        }
        if (msg.ballState && ball) {
            ball.setState(msg.ballState);
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
            // 🎮 Use camera manager for perspective-aware shake (FPS or top-down)
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
            
            // Update UI with scores and player names from current player's perspective
            const currentPlayer = localPlayerId === player1.getPlayerId() ? player1 : player2;
            const opponent = localPlayerId === player1.getPlayerId() ? player2 : player1;
            const currentPlayerScore = currentScores[currentPlayer.getPlayerId()] || 0;
            const opponentScore = currentScores[opponent.getPlayerId()] || 0;
            
            updateScoresUIVersus(currentPlayerScore, opponentScore, currentPlayer.playerName, opponent.playerName);
            

        }
    });

    // Add game end handler
    clientConnection.onGameEnd(async (msg: any) => {
        const gameEndData = msg as GameEndData;
        isGameOver = true;
        
        
        // Stop the game loop and clean up
        if (isGameLoopRunning && map?.getEngine) {
            map.getEngine.stopRenderLoop();
            isGameLoopRunning = false;
        }
        
        // ⭐ ENHANCED FINAL DETECTION: Check multiple indicators for finals
        const isFinal = gameEndData.matchType === 'final' || 
                       gameEndData.gameStats?.matchType === 'final' ||
                       gameEndData.finalMatchType === 'winners' ||
                       gameEndData.finalMatchType === 'losers' ||
                       gameEndData.gameStats?.finalMatchType === 'winners' ||
                       gameEndData.gameStats?.finalMatchType === 'losers' ||
                       roomId?.includes('final') ||
                       gameEndData.roomId?.includes('final') ||
                       roomId?.includes('Final') ||
                       gameEndData.roomId?.includes('Final');
        
        // Check if this is a semi-final match - improved detection (but exclude finals)
        const isSemiFinal = !isFinal && (
                           gameEndData.matchType === 'semi-final' || 
                           gameEndData.gameStats?.matchType === 'semi-final' ||
                           roomId?.includes('semi') ||
                           gameEndData.roomId?.includes('semi') ||
                           roomId?.includes('Semi') ||
                           gameEndData.roomId?.includes('Semi'));
        
        
        if (isFinal) {
            // For finals, show tournament final placement splash screen
            const isWinner = gameEndData.winner.id === localPlayerId;
            const opponentName = gameEndData.winner.id === localPlayerId ? 
                                gameEndData.loser.username : 
                                gameEndData.winner.username;
            
            
            // Determine final placement based on room type and result
            let finalPlacement: 1 | 2 | 3 | 4;
            
            // ⭐ IMPROVED: Use server-provided final match type first, then fallback to room ID parsing
            let isWinnersFinal = false;
            let isLosersFinal = false;
            
            // Try server-provided finalMatchType first (more reliable)
            if (gameEndData.finalMatchType) {
                isWinnersFinal = gameEndData.finalMatchType === 'winners';
                isLosersFinal = gameEndData.finalMatchType === 'losers';
            } else if (gameEndData.gameStats?.finalMatchType) {
                isWinnersFinal = gameEndData.gameStats.finalMatchType === 'winners';
                isLosersFinal = gameEndData.gameStats.finalMatchType === 'losers';
            } else {
                // Fallback to room ID parsing
                isWinnersFinal = roomId?.includes('winners') || 
                                gameEndData.roomId?.includes('winners') ||
                                roomId?.includes('Winners') || 
                                gameEndData.roomId?.includes('Winners');
                
                isLosersFinal = roomId?.includes('losers') || 
                               gameEndData.roomId?.includes('losers') ||
                               roomId?.includes('Losers') || 
                               gameEndData.roomId?.includes('Losers');
                
            }
            
            
            if (isWinnersFinal) {
                // Winners final: 1st place for winner, 2nd place for loser
                finalPlacement = isWinner ? 1 : 2;
            } else if (isLosersFinal) {
                // Losers final: 3rd place for winner, 4th place for loser
                finalPlacement = isWinner ? 3 : 4;
            } else {
                // Fallback - try to determine from room name or default to middle placement
                console.warn('🏆 ⚠️ Could not determine final type, defaulting placement');
                console.warn('🏆 DEBUG: ⚠️ No clear room type detected - this should not happen in finals!');
                console.warn('🏆 DEBUG: ⚠️ Available data:', { 
                    roomId, 
                    'gameEndData.roomId': gameEndData.roomId,
                    'gameEndData.finalMatchType': gameEndData.finalMatchType,
                    'gameEndData.gameStats?.finalMatchType': gameEndData.gameStats?.finalMatchType
                });
                finalPlacement = isWinner ? 1 : 2; // Default to winners final
            }
            
            try {
                await TournamentClientHandler.handleFinalGameEnd(gameEndData, localPlayerId, opponentName, finalPlacement);
            } catch (error) {
                console.error('🏆 ERROR: Error showing final splash:', error);
                // ⭐ CLEANUP ON ERROR: If final splash fails, still cleanup and try to navigate
                cleanup();
            }
            
            // ⭐ NOTE: No cleanup() call here for successful finals - handled by tournament handler with navigation
        } else if (isSemiFinal) {
            // For semi-finals, show tournament-specific splash screen as overlay
            const opponentName = gameEndData.winner.id === localPlayerId ? 
                                gameEndData.loser.username : 
                                gameEndData.winner.username;
            
            
            try {
                await TournamentClientHandler.handleSemiFinalGameEnd(gameEndData, localPlayerId, opponentName);
            } catch (error) {
                console.error('🏆 ERROR: Error showing semi-final splash:', error);
            }
            
            // Don't cleanup immediately for tournament matches - let tournament system handle it
        } else {
            // Regular 1v1 match - show regular splash screen and cleanup
            showGameEndSplashScreen(gameEndData, localPlayerId);
            cleanup();
        }
    });

    // Add handler for waiting status and tournament advancement
    clientConnection.socket.addEventListener('message', async (event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data);
            
            
            // 🏆 QUEUE MANAGEMENT: If showing semi-final splash, queue non-critical messages
            if (isShowingSemiFinalSplash && (message.type === 'init' || message.type === 'waitingForPlayers')) {
                queuedMessages.push(message);
                return;
            }
            
            if (message.type === 'waitingForPlayers') {
                handleWaitingForPlayers(message, updateGameStatus);
            } else if (message.type === 'tournamentAdvancement') {

                updateGameStatus(message.message || 'Tournament advancement...');
                
                // 🏆 SEMI-FINAL DETECTION: Check if this is the end of a semi-final
                if (message.status === 'transferred_to_final') {
                    // ⭐ SAFETY CHECK: Prevent showing semi-final splash if we're already in a final room
                    const currentlyInFinalRoom = roomId?.includes('final') || roomId?.includes('Final');
                    if (currentlyInFinalRoom) {
                        return; // Don't show semi-final splash for final room activities
                    }
                    
                    // Show semi-final splash screen FIRST, then handle tournament advancement
                    const isWinner = message.playerType === 'winner';
                    const opponentName = message.opponentName || 'Opponent'; // Default if not provided
                    const score = message.score || ''; // Default if not provided
                    
                    // Show splash screen and WAIT for it to complete before tournament advancement
                    try {
                        isShowingSemiFinalSplash = true; // Block incoming messages
                        
                        await TournamentClientHandler.handleSemiFinalGameEnd(
                            {
                                winner: { 
                                    id: isWinner ? localPlayerId : 'opponent',
                                    username: isWinner ? 'You' : opponentName,
                                    score: 0 // We'll use message.score if available
                                },
                                loser: {
                                    id: !isWinner ? localPlayerId : 'opponent', 
                                    username: !isWinner ? 'You' : opponentName,
                                    score: 0
                                },
                                roomId: roomId || '',
                                matchDuration: 0,
                                gameStats: { totalRebounds: 0 },
                                matchEndTime: new Date()
                            },
                            localPlayerId,
                            opponentName
                        );
                        
                        isShowingSemiFinalSplash = false; // Allow new messages
                        
                        // Process any queued messages that arrived during splash
                        await processQueuedMessages();
                        
                    } catch (error) {
                        console.error('🏆 ERROR: Failed to show semi-final splash:', error);
                        isShowingSemiFinalSplash = false; // Reset flag on error
                    }
                    
                    // NOW handle tournament advancement after splash screen is done
                    TournamentClientHandler.handleTournamentAdvancement(
                        message,
                        updateGameStatus,
                        {
                            isGameOver,
                            isGameLoopRunning,
                            map,
                            ball,
                            player1,
                            player2
                        }
                    );
                    
                    // Reset game state for finals
                    // ⭐ CRITICAL: Reset all game state for final match
                    isGameOver = false; // Allow new game to start
                    isGameLoopRunning = false;
                    ballUpdateReceived = false;
                    syncCount = 0;
                    lastBallPosition = null;
                    lastSyncTime = null;
                    predictedPosition = null;
                    
                    // Clear object references (TournamentClientHandler already disposed/nulled them)
                    map = null;
                    ball = null;
                    player1 = null;
                    player2 = null;
                } else {
                    // For non-semi-final tournament advancement, handle immediately
                    TournamentClientHandler.handleTournamentAdvancement(
                        message,
                        updateGameStatus,
                        {
                            isGameOver,
                            isGameLoopRunning,
                            map,
                            ball,
                            player1,
                            player2
                        }
                    );
                }
            } else if (message.type === 'hideGameElements') {
                // Handle semi-final completion element hiding
                TournamentClientHandler.handleHideGameElements(
                    message,
                    updateGameStatus,
                    { ball, player1, player2 }
                );
            } else if (message.type === 'gameEnd' || message.type === 'matchEnd' || message.type === 'tournamentGameEnd') {
                // 🏆 REMOVE DUPLICATE: Game end messages should ONLY be handled by clientConnection.onGameEnd
                // This prevents conflicts between multiple event handlers
                // DO NOT process game end here - let the primary onGameEnd handler deal with it
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId, playerName, opponentName }) => {

        initTime = Date.now();
        roomId = rId || null;
        localPlayerId = playerId || null;

        // ⭐ TOURNAMENT FIX: Reset game state for clean start (important for finals)
        TournamentClientHandler.resetTournamentGameState({
            isGameOver,
            isGameLoopRunning
        });
        isGameOver = false;
        isGameLoopRunning = false;

        // Store player names for UI updates
        let player1Name, player2Name;
        if (role === 0) {
            player1Name = playerName || 'Player 1';
            player2Name = opponentName || 'Player 2';
        } else {
            player1Name = opponentName || 'Player 1';
            player2Name = playerName || 'Player 2';
        }

        // Get player names for splash screen (from current player's perspective)
        const currentPlayerName = playerName || 'You';
        const opponentDisplayName = opponentName || 'Opponent';
        
        // Show splash screen BEFORE creating any game elements
        updateGameStatus('Preparing match...');
        
        try {
            // Show splash screen for 3 seconds
            await showSplashScreen(currentPlayerName, opponentDisplayName, 3000);
        } catch (error) {
            console.error('Error showing splash screen:', error);
            // Continue with game initialization even if splash screen fails
        }
        
        // NOW create the game elements AFTER splash screen

        // Create new map (should always be fresh for tournament games)
        if (!map) {
            try {
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
        }

        // Create fresh paddles (important for tournament final matches)
        if (!player1 || !player2) {
            if (!playerId || !opponentId) {
                console.error('Missing player IDs');
                return;
            }
            
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
                
                TournamentClientHandler.resetTournamentPaddlePositions(player1, player2);
            } catch (e) {
                console.error('Paddle creation failed:', e);
                return;
            }
        }

        // Create fresh ball (important for tournament final matches)
        if (!ball) {
            try {
                ball = new Ball(player1, player2);
                ball.createBall(map.getScene!);
                if (ball.ballBody) {
                    ball.ballBody.metadata = { roomId };
                    ball.ballBody.position = new BABYLON.Vector3(0, 0, 0);
                    ball.ballBody.isVisible = true;
                }
                ball.position = new BABYLON.Vector3(0, 0, 0);
                ball.isRespawning = true;
                ball.respawnTime = 0;
                ball.hasValidPosition = true;
                
                // Request initial ball respawn from server
                clientConnection!.send({
                    type: 'requestBallRespawn',
                    isInitial: true
                });
                console.log('Requested initial ball respawn');
            } catch (e) {
                console.error('Ball creation failed:', e);
                return;
            }
        }

        // ⭐ TOURNAMENT FIX: Ensure all elements are visible for new game
        TournamentClientHandler.ensureTournamentElementsVisible({
            ball,
            player1,
            player2
        });

        // ⭐ CRITICAL FIX: Double-check paddle visibility before animation
        if (player1?.paddleBody) {
            player1.paddleBody.isVisible = true;
        }
        if (player2?.paddleBody) {
            player2.paddleBody.isVisible = true;
        }
        if (ball?.ballBody) {
            ball.ballBody.isVisible = true;
        }

        // 🎮 Initialize camera manager with all game elements
        if (map && player1 && player2 && localPlayerId) {
            cameraManager.initialize(map, player1, player2, localPlayerId);
            console.log('🎮 Camera manager initialized after game setup');
        }

        updateGameStatus('Game starting...');
        
        // 🔊 Initialize sound manager
        soundManager.preloadSounds().catch(error => {
            console.warn('Failed to initialize sound manager:', error);
        });
        updateScoresUIVersus(0, 0, player1Name, player2Name);
        // Update player names in UI from current player's perspective
        updatePlayerNamesVersus(playerName || 'Player', opponentName || 'Opponent');
        
        // Set up keyboard controls if not already set
        if (!(window as any).gameControlsInitialized) {
            const keydownHandler = (event: KeyboardEvent) => {
                if (isGameOver) return;
                
                // 🎮 FIX: Use perspective-aware control mapping for FPS mode
                // In FPS mode, Player2 (left side, looking right) needs inverted controls
                const shouldInvert = cameraManager.shouldInvertControls();
                
                if (event.key === 'ArrowLeft') {
                    // Determine the actual direction we'll send based on perspective
                    const direction = shouldInvert ? 'down' : 'up';
                    
                    // Set the appropriate state based on actual direction being sent
                    if (direction === 'up' && !isUpPressed) {
                        isUpPressed = true;
                        clientConnection!.send({ type: 'keyDown', direction: 'up' });
                        console.log(`🎮 ArrowLeft pressed, sending direction: up (inverted: ${shouldInvert})`);
                    } else if (direction === 'down' && !isDownPressed) {
                        isDownPressed = true;
                        clientConnection!.send({ type: 'keyDown', direction: 'down' });
                        console.log(`🎮 ArrowLeft pressed, sending direction: down (inverted: ${shouldInvert})`);
                    }
                } else if (event.key === 'ArrowRight') {
                    // Determine the actual direction we'll send based on perspective
                    const direction = shouldInvert ? 'up' : 'down';
                    
                    // Set the appropriate state based on actual direction being sent
                    if (direction === 'up' && !isUpPressed) {
                        isUpPressed = true;
                        clientConnection!.send({ type: 'keyDown', direction: 'up' });
                        console.log(`🎮 ArrowRight pressed, sending direction: up (inverted: ${shouldInvert})`);
                    } else if (direction === 'down' && !isDownPressed) {
                        isDownPressed = true;
                        clientConnection!.send({ type: 'keyDown', direction: 'down' });
                        console.log(`🎮 ArrowRight pressed, sending direction: down (inverted: ${shouldInvert})`);
                    }
                }
            };

            const keyupHandler = (event: KeyboardEvent) => {
                if (isGameOver) return;
                
                // 🎮 FIX: Use perspective-aware control mapping for FPS mode
                const shouldInvert = cameraManager.shouldInvertControls();
                
                if (event.key === 'ArrowLeft') {
                    // Determine the actual direction we were sending based on perspective
                    const direction = shouldInvert ? 'down' : 'up';
                    
                    // Release the appropriate state based on actual direction that was being sent
                    if (direction === 'up' && isUpPressed) {
                        isUpPressed = false;
                        clientConnection!.send({ type: 'keyUp', direction: 'up' });
                        console.log(`🎮 ArrowLeft released, sending direction: up (inverted: ${shouldInvert})`);
                    } else if (direction === 'down' && isDownPressed) {
                        isDownPressed = false;
                        clientConnection!.send({ type: 'keyUp', direction: 'down' });
                        console.log(`🎮 ArrowLeft released, sending direction: down (inverted: ${shouldInvert})`);
                    }
                } else if (event.key === 'ArrowRight') {
                    // Determine the actual direction we were sending based on perspective
                    const direction = shouldInvert ? 'up' : 'down';
                    
                    // Release the appropriate state based on actual direction that was being sent
                    if (direction === 'up' && isUpPressed) {
                        isUpPressed = false;
                        clientConnection!.send({ type: 'keyUp', direction: 'up' });
                        console.log(`🎮 ArrowRight released, sending direction: up (inverted: ${shouldInvert})`);
                    } else if (direction === 'down' && isDownPressed) {
                        isDownPressed = false;
                        clientConnection!.send({ type: 'keyUp', direction: 'down' });
                        console.log(`🎮 ArrowRight released, sending direction: down (inverted: ${shouldInvert})`);
                    }
                }
            };

            document.addEventListener('keydown', keydownHandler);
            document.addEventListener('keyup', keyupHandler);
            
            // **CRITICAL**: Store handlers globally for cleanup
            (window as any).gameKeydownHandler = keydownHandler;
            (window as any).gameKeyupHandler = keyupHandler;
            (window as any).gameControlsInitialized = true;

        }
        
        // Start the game loop after match animation if not already running
        if (!isGameLoopRunning) {
            try {
                await map.launchMatchAnimation();
                
                // ⭐ CRITICAL FIX: Re-enforce visibility after animation completes
                if (player1?.paddleBody) {
                    player1.paddleBody.isVisible = true;
                }
                if (player2?.paddleBody) {
                    player2.paddleBody.isVisible = true;
                }
                if (ball?.ballBody) {
                    ball.ballBody.isVisible = true;
                    // ⭐ CRITICAL FIX: Ensure ball is positioned for visibility
                    if (ball.ballBody.position.y < -1) {
                        ball.ballBody.position.y = 0;
                        ball.position.y = 0;
                    }
                }

                // 🎮 EXPERIMENTAL: Switch to FPS perspective after animation completes
                console.log('🎮 EXPERIMENT: Switching to FPS perspective for local player');
                cameraManager.switchToFPSAfterAnimation();
                
                // Notify server that animation is complete
                if (clientConnection) {
                    clientConnection.send({
                        type: 'animationComplete',
                        playerId: localPlayerId
                    });
                    console.log('Sent animationComplete to server');
                }
                
                setupGameLoop();
            } catch (e) {
                console.error('Error during game initialization:', e);
                
                // ⭐ CRITICAL FIX: Even on error, ensure elements are visible
                if (player1?.paddleBody) {
                    player1.paddleBody.isVisible = true;
                }
                if (player2?.paddleBody) {
                    player2.paddleBody.isVisible = true;
                }
                if (ball?.ballBody) {
                    ball.ballBody.isVisible = true;
                    // ⭐ CRITICAL FIX: Ensure ball is positioned for visibility even on error
                    if (ball.ballBody.position.y < -1) {
                        ball.ballBody.position.y = 0;
                        ball.position.y = 0;
                    }
                }
                
                // Send animation complete anyway to prevent server hanging
                if (clientConnection) {
                    clientConnection.send({
                        type: 'animationComplete',
                        playerId: localPlayerId
                    });
                    console.log('Sent animationComplete to server (after error)');
                }
                // Start game loop anyway if animation fails
                setupGameLoop();
            }
        }
    });
}

// Export cleanup function for Leave Game button
export function cleanup(): void {
    // Update disconnect handler with current state before cleanup
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
    
    // Use the dedicated disconnect cleanup
    disconnectCleanup();
    
    // 🎮 Cleanup camera manager
    cameraManager.dispose();
    
    // Update local variables to match cleanup
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
    // Update disconnect handler with current state before leaving
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
    
    // Use the dedicated disconnect leave game
    disconnectLeaveGame();
    
    // 🎮 Cleanup camera manager
    cameraManager.dispose();
    
    // Update local variables to match cleanup
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
            let paddleMoved = false;

            if (isUpPressed && !isDownPressed) {
                localPlayer.move(-1, deltaTime);
                paddleMoved = true;
            } else if (isDownPressed && !isUpPressed) {
                localPlayer.move(1, deltaTime);
                paddleMoved = true;
            }

            // Send paddle position updates at a fixed rate
            if (paddleMoved && now - lastPaddleUpdate >= PADDLE_UPDATE_INTERVAL && clientConnection) {
                const paddlePos = localPlayer.getPaddleBodyPos;
                if (paddlePos) {
                    clientConnection.send({
                        type: 'paddlePosition',
                        playerId: localPlayerId,
                        positionZ: paddlePos.z,
                    });
                    lastPaddleUpdate = now;
                }
            }
        }

        // 🎮 Update camera system
        cameraManager.update();

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
    } else {
        console.error('Failed to start game loop: map or engine not initialized');
    }
}

// Export function to setup join game button (called explicitly when needed)
export function setupJoinGameButton(): void {
    // Only setup if not already setup
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

                // Find an available player slot
                const availablePlayers = players.filter(p => !p.readyToPlay);
                if (availablePlayers.length === 0) {
                    updateGameStatus('All players are already in game. Please wait.');
                    joinGameBtn.disabled = false;
                    return;
                }

                const playerId = availablePlayers[0].id;
                updateGameStatus('Joining game...');
                
                // Initialize game connection
                initializeGame(playerId);
                
                // Set player as ready
                await setPlayerReady(playerId);
                updateGameStatus('Waiting for other player to join...');

            } catch (error) {
                console.error('Error joining game:', error);
                updateGameStatus('Error joining game. Please try again.');
                joinGameBtn.disabled = false;
            }
        };
        
        joinGameBtn.addEventListener('click', clickHandler);
        
        // Store reference for cleanup
        (window as any).joinGameButtonHandler = clickHandler;
        (window as any).joinGameButtonSetup = true;
    }
} 