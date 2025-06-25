import { playerPaddle } from '../player/player.js';
import { gameMap } from '../map/gameMap.js';
import { webSocketClient } from '../webSocketClient/webSocketClient.js';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { fetchWithSelfSigned } from '../utils/fetch.js';
import { updatePlayerNames, updateScoresUI, updateScoresUIVersus, updatePlayerNamesVersus, updateGameStatus } from '../playerUi/playerUi.js';
import { handleWaitingForPlayers } from '../ui/waitingStatusHandler.js';
import { soundManager } from '../audio/soundManager.js';
import { TournamentClientHandler } from '../tournament/tournamentClientHandler.js';
import { showSplashScreen } from '../ui/splashScreen.js';
import { showGameEndSplashScreen, GameEndData } from '../utils/splashScreenUtils.js';

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
    console.log('🏆 DEBUG: Processing queued messages:', queuedMessages.length);
    while (queuedMessages.length > 0) {
        const message = queuedMessages.shift();
        console.log('🏆 DEBUG: Processing queued message:', message.type);
        
        if (message.type === 'waitingForPlayers') {
            handleWaitingForPlayers(message, updateGameStatus);
        } else if (message.type === 'init') {
            // Re-trigger init handler - this will be handled by the onInit callback already set up
            console.log('🏆 DEBUG: Init message will be processed when connection is ready');
        }
        
        // Small delay between processing messages to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Function to handle sound events
function handleSoundEvent(msg: any): void {
    const { sound, ballSpeed, rebounds } = msg;
    
    switch (sound) {
        case 'paddleHit':
            // Vary volume based on ball speed for more immersion
            const volumeMultiplier = Math.min(1, (ballSpeed || 25) / 50);
            soundManager.playSound('paddleHit', volumeMultiplier);
            break;
            
        case 'wallHit':
            soundManager.playSound('wallHit', 0.7);
            break;
            
        case 'lostPoint':
            soundManager.playSound('lostPoint', 1.0);
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

    clientConnection.socket.addEventListener('close', () => {
        updateGameStatus('Connection closed');
        // Clean up game loop if it's running
        if (isGameLoopRunning && map && map.getEngine) {
            map.getEngine.stopRenderLoop();
            isGameLoopRunning = false;
        }
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
            map.triggerCameraShake().catch(error => {
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
        console.log('🏆 DEBUG: ⭐ PRIMARY onGameEnd handler triggered!', msg);
        const gameEndData = msg as GameEndData;
        isGameOver = true;
        
        // DEBUG: Log the entire game end data to understand the structure
        console.log('🏆 DEBUG: ⭐ FULL Game end data received:', JSON.stringify(gameEndData, null, 2));
        console.log('🏆 DEBUG: ⭐ Current roomId:', roomId);
        console.log('🏆 DEBUG: ⭐ localPlayerId:', localPlayerId);
        console.log('🏆 DEBUG: ⭐ CRITICAL - Check finalMatchType:', {
            'gameEndData.finalMatchType': gameEndData.finalMatchType,
            'gameEndData.gameStats?.finalMatchType': gameEndData.gameStats?.finalMatchType,
            'gameEndData.matchType': gameEndData.matchType
        });
        
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
        
        console.log('🏆 DEBUG: Match type detection results:', { isFinal, isSemiFinal });
        console.log('🏆 DEBUG: Detection data:', {
            'gameEndData.matchType': gameEndData.matchType,
            'gameEndData.gameStats?.matchType': gameEndData.gameStats?.matchType,
            'roomId': roomId,
            'gameEndData.roomId': gameEndData.roomId,
            'roomId?.includes("final")': roomId?.includes('final'),
            'roomId?.includes("semi")': roomId?.includes('semi'),
            'Full gameEndData': gameEndData
        });
        
        // 🏆 CRITICAL DEBUG: Log what type of match this is
        if (isFinal) {
            console.log('🏆 ✅ ⭐ FINAL MATCH DETECTED - Will show final placement splash screen');
            console.log('🏆 ✅ ⭐ FINAL DETECTION DETAILS:', {
                'gameEndData.matchType': gameEndData.matchType,
                'gameEndData.finalMatchType': gameEndData.finalMatchType,
                'gameEndData.gameStats?.matchType': gameEndData.gameStats?.matchType,
                'gameEndData.gameStats?.finalMatchType': gameEndData.gameStats?.finalMatchType,
                'roomId?.includes("final")': roomId?.includes('final'),
                'roomId': roomId
            });
        } else if (isSemiFinal) {
            console.log('🏆 ✅ SEMI-FINAL MATCH DETECTED - Will show semi-final splash screen');
        } else {
            console.log('🏆 ✅ REGULAR MATCH DETECTED - Will show regular splash screen');
        }

        if (isFinal) {
            // For finals, show tournament final placement splash screen
            console.log('🏆 Final match detected, showing tournament final placement splash screen');
            const isWinner = gameEndData.winner.id === localPlayerId;
            const opponentName = gameEndData.winner.id === localPlayerId ? 
                                gameEndData.loser.username : 
                                gameEndData.winner.username;
            
            console.log('🏆 DEBUG: Final game - isWinner:', isWinner, 'opponentName:', opponentName);
            
            // Determine final placement based on room type and result
            let finalPlacement: 1 | 2 | 3 | 4;
            
            // ⭐ IMPROVED: Use server-provided final match type first, then fallback to room ID parsing
            let isWinnersFinal = false;
            let isLosersFinal = false;
            
            // Try server-provided finalMatchType first (more reliable)
            if (gameEndData.finalMatchType) {
                isWinnersFinal = gameEndData.finalMatchType === 'winners';
                isLosersFinal = gameEndData.finalMatchType === 'losers';
                console.log(`🏆 DEBUG: Using server finalMatchType: ${gameEndData.finalMatchType}`);
            } else if (gameEndData.gameStats?.finalMatchType) {
                isWinnersFinal = gameEndData.gameStats.finalMatchType === 'winners';
                isLosersFinal = gameEndData.gameStats.finalMatchType === 'losers';
                console.log(`🏆 DEBUG: Using server gameStats.finalMatchType: ${gameEndData.gameStats.finalMatchType}`);
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
                
                console.log('🏆 DEBUG: Using room ID fallback detection');
            }
            
            console.log('🏆 DEBUG: Final type determination - isWinnersFinal:', isWinnersFinal, 'isLosersFinal:', isLosersFinal);
            console.log('🏆 DEBUG: Room and match data:', {
                roomId: roomId,
                'gameEndData.roomId': gameEndData.roomId,
                'gameEndData.finalMatchType': gameEndData.finalMatchType,
                'gameEndData.gameStats?.finalMatchType': gameEndData.gameStats?.finalMatchType
            });
            
            if (isWinnersFinal) {
                // Winners final: 1st place for winner, 2nd place for loser
                finalPlacement = isWinner ? 1 : 2;
                console.log('🏆 DEBUG: ⭐ WINNERS FINAL detected - placement:', finalPlacement, '(winner gets 1st, loser gets 2nd)');
                console.log('🏆 DEBUG: ⭐ LOGIC: Winners final + isWinner:', isWinner, '→ placement:', finalPlacement);
            } else if (isLosersFinal) {
                // Losers final: 3rd place for winner, 4th place for loser
                finalPlacement = isWinner ? 3 : 4;
                console.log('🏆 DEBUG: ⭐ LOSERS FINAL detected - placement:', finalPlacement, '(winner gets 3rd, loser gets 4th)');
                console.log('🏆 DEBUG: ⭐ LOGIC: Losers final + isWinner:', isWinner, '→ placement:', finalPlacement);
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
                console.log('🏆 DEBUG: ⚠️ Fallback placement:', finalPlacement);
            }
            
            console.log(`🏆 Final placement determined: ${finalPlacement}${TournamentClientHandler.getPlacementSuffix(finalPlacement)} place`);
            
            try {
                await TournamentClientHandler.handleFinalGameEnd(gameEndData, localPlayerId, opponentName, finalPlacement);
                console.log('🏆 DEBUG: TournamentClientHandler.handleFinalGameEnd completed successfully');
                console.log('🏆 DEBUG: Final game completed - navigation and cleanup handled by tournament handler');
            } catch (error) {
                console.error('🏆 ERROR: Error showing final splash:', error);
                // ⭐ CLEANUP ON ERROR: If final splash fails, still cleanup and try to navigate
                console.log('🏆 DEBUG: Cleaning up after final splash error...');
                cleanup();
            }
            
            // ⭐ NOTE: No cleanup() call here for successful finals - handled by tournament handler with navigation
        } else if (isSemiFinal) {
            // For semi-finals, show tournament-specific splash screen as overlay
            console.log('🏆 Semi-final match detected, showing tournament splash screen');
            const opponentName = gameEndData.winner.id === localPlayerId ? 
                                gameEndData.loser.username : 
                                gameEndData.winner.username;
            
            console.log('🏆 DEBUG: Opponent name:', opponentName);
            console.log('🏆 DEBUG: About to call TournamentClientHandler.handleSemiFinalGameEnd');
            
            try {
                await TournamentClientHandler.handleSemiFinalGameEnd(gameEndData, localPlayerId, opponentName);
                console.log('🏆 DEBUG: TournamentClientHandler.handleSemiFinalGameEnd completed successfully');
            } catch (error) {
                console.error('🏆 ERROR: Error showing semi-final splash:', error);
            }
            
            // Don't cleanup immediately for tournament matches - let tournament system handle it
        } else {
            // Regular 1v1 match - show regular splash screen and cleanup
            console.log('🏆 DEBUG: Regular match detected, showing normal splash screen');
            showGameEndSplashScreen(gameEndData, localPlayerId);
            cleanup();
        }
    });

    // Add handler for waiting status and tournament advancement
    clientConnection.socket.addEventListener('message', async (event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data);
            
            // 🏆 DEBUG: Log ALL messages to see what's happening during semi-finals
            // console.log('🏆 DEBUG: WebSocket message received:', message.type, message);
            
            // 🏆 QUEUE MANAGEMENT: If showing semi-final splash, queue non-critical messages
            if (isShowingSemiFinalSplash && (message.type === 'init' || message.type === 'waitingForPlayers')) {
                console.log('🏆 DEBUG: Queueing message during semi-final splash:', message.type);
                queuedMessages.push(message);
                return;
            }
            
            if (message.type === 'waitingForPlayers') {
                handleWaitingForPlayers(message, updateGameStatus);
            } else if (message.type === 'tournamentAdvancement') {

                updateGameStatus(message.message || 'Tournament advancement...');
                
                // 🏆 SEMI-FINAL DETECTION: Check if this is the end of a semi-final
                if (message.status === 'transferred_to_final') {
                    console.log('🏆 DEBUG: Semi-final ended detected in tournamentAdvancement:', message);
                    
                    // ⭐ SAFETY CHECK: Prevent showing semi-final splash if we're already in a final room
                    const currentlyInFinalRoom = roomId?.includes('final') || roomId?.includes('Final');
                    if (currentlyInFinalRoom) {
                        console.log('🏆 ⚠️ SAFETY: Ignoring transferred_to_final message - already in final room:', roomId);
                        return; // Don't show semi-final splash for final room activities
                    }
                    
                    // Show semi-final splash screen FIRST, then handle tournament advancement
                    const isWinner = message.playerType === 'winner';
                    const opponentName = message.opponentName || 'Opponent'; // Default if not provided
                    const score = message.score || ''; // Default if not provided
                    
                    console.log('🏆 DEBUG: Semi-final result - isWinner:', isWinner, 'opponentName:', opponentName);
                    
                    // Show splash screen and WAIT for it to complete before tournament advancement
                    try {
                        console.log('🏆 DEBUG: Setting semi-final splash flag and showing splash screen...');
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
                        
                        console.log('🏆 DEBUG: Semi-final splash screen completed successfully');
                        isShowingSemiFinalSplash = false; // Allow new messages
                        
                        // Process any queued messages that arrived during splash
                        await processQueuedMessages();
                        
                    } catch (error) {
                        console.error('🏆 ERROR: Failed to show semi-final splash:', error);
                        isShowingSemiFinalSplash = false; // Reset flag on error
                    }
                    
                    // NOW handle tournament advancement after splash screen is done
                    console.log('🏆 DEBUG: Semi-final splash complete, now handling tournament advancement...');
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
                console.log('🏆 DEBUG: ⚠️ Game end message received in secondary listener - IGNORING to prevent conflicts');
                console.log('🏆 DEBUG: ⚠️ Message type:', message.type, 'will be handled by primary onGameEnd listener');
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
                
                // ⭐ TOURNAMENT FIX: Reset paddle positions for tournament games
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
                    // ⭐ CRITICAL FIX: Position ball at center (y=0) instead of y=-2 for visibility
                    ball.ballBody.position = new BABYLON.Vector3(0, 0, 0);
                    ball.ballBody.isVisible = true;
                }
                // ⭐ CRITICAL FIX: Set ball position to center for tournament finals
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
            console.log('✅ Player1 paddle made visible before animation');
        }
        if (player2?.paddleBody) {
            player2.paddleBody.isVisible = true;
            console.log('✅ Player2 paddle made visible before animation');
        }
        if (ball?.ballBody) {
            ball.ballBody.isVisible = true;
            console.log('✅ Ball made visible before animation');
        }

        updateGameStatus('Game starting...');
        
        // 🔊 Initialize sound manager
        soundManager.preloadSounds().catch(error => {
            console.warn('Failed to initialize sound manager:', error);
        });
        
        // ⭐ TOURNAMENT FIX: Reset scores for clean start
        updateScoresUIVersus(0, 0, player1Name, player2Name);
        
        // Update player names in UI from current player's perspective
        updatePlayerNamesVersus(playerName || 'Player', opponentName || 'Opponent');
        
        // Set up keyboard controls if not already set
        if (!(window as any).gameControlsInitialized) {
            // **CRITICAL FIX**: Store event handler references for proper cleanup
            const keydownHandler = (event: KeyboardEvent) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && !isUpPressed) {
                    isUpPressed = true;
                    clientConnection!.send({ type: 'keyDown', direction: 'up' });
                } else if (event.key === 'ArrowDown' && !isDownPressed) {
                    isDownPressed = true;
                    clientConnection!.send({ type: 'keyDown', direction: 'down' });
                }
            };

            const keyupHandler = (event: KeyboardEvent) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && isUpPressed) {
                    isUpPressed = false;
                    clientConnection!.send({ type: 'keyUp', direction: 'up' });
                } else if (event.key === 'ArrowDown' && isDownPressed) {
                    isDownPressed = false;
                    clientConnection!.send({ type: 'keyUp', direction: 'down' });
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
                console.log('🎬 Starting match animation with visible elements...');
                await map.launchMatchAnimation();
                console.log('🎬 Match animation completed');
                
                // ⭐ CRITICAL FIX: Re-enforce visibility after animation completes
                if (player1?.paddleBody) {
                    player1.paddleBody.isVisible = true;
                    console.log('✅ Player1 paddle re-enforced visible after animation');
                }
                if (player2?.paddleBody) {
                    player2.paddleBody.isVisible = true;
                    console.log('✅ Player2 paddle re-enforced visible after animation');
                }
                if (ball?.ballBody) {
                    ball.ballBody.isVisible = true;
                    // ⭐ CRITICAL FIX: Ensure ball is positioned for visibility
                    if (ball.ballBody.position.y < -1) {
                        ball.ballBody.position.y = 0;
                        ball.position.y = 0;
                    }
                    console.log('✅ Ball re-enforced visible after animation at position:', ball.ballBody.position);
                }
                
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
    // Set game as over to immediately stop input and rendering
    isGameOver = true;
    
    if (isGameLoopRunning && map?.getEngine) {
        map.getEngine.stopRenderLoop();
        isGameLoopRunning = false;
    }

    if (clientConnection?.socket?.readyState === WebSocket.OPEN) {
        clientConnection.socket.close();
    }

    // Clean up join game button handler
    if ((window as any).joinGameButtonHandler && (window as any).joinGameButtonSetup) {
        const joinGameBtn = document.getElementById('joinGameBtn') as HTMLButtonElement;
        if (joinGameBtn) {
            joinGameBtn.removeEventListener('click', (window as any).joinGameButtonHandler);
        }
        delete (window as any).joinGameButtonHandler;
        (window as any).joinGameButtonSetup = false;
    }

    // **CRITICAL FIX**: Clean up keyboard event listeners for proper re-initialization
    if ((window as any).gameControlsInitialized) {
        if ((window as any).gameKeydownHandler) {
            document.removeEventListener('keydown', (window as any).gameKeydownHandler);
            delete (window as any).gameKeydownHandler;
        }
        if ((window as any).gameKeyupHandler) {
            document.removeEventListener('keyup', (window as any).gameKeyupHandler);
            delete (window as any).gameKeyupHandler;
        }
        (window as any).gameControlsInitialized = false;
    }

    // **ADDITIONAL SAFETY**: Reset key states to prevent stuck keys
    isUpPressed = false;
    isDownPressed = false;
    
    // Remove global leaveGame function
    if ((window as any).leaveGame) {
        delete (window as any).leaveGame;
    }

    // Nullify game objects
    clientConnection = null;
    player1 = null;
    player2 = null;
    ball = null;
    map = null;
    roomId = null;
    localPlayerId = null;
}

// Export leaveGame function for Leave Game button
export function leaveGame(): void {
    // Set game as over to immediately stop input and rendering
    isGameOver = true;
    
    // Send leave game message to server if connection exists
    if (clientConnection) {
        if (clientConnection.leaveGame) {
            clientConnection.leaveGame();
        } else if (clientConnection.socket?.readyState === WebSocket.OPEN) {
            clientConnection.send({ type: 'leaveGame', playerId: localPlayerId });
            setTimeout(() => {
                if (clientConnection?.socket?.readyState === WebSocket.OPEN) {
                    clientConnection.socket.close();
                }
            }, 100);
        }
    }
    cleanup();
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