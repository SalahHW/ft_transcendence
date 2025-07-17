/**
 * Tournament Match Disconnect Handler
 * Handles disconnections for tournament matches (semi-finals, finals) with state-based forfeit logic
 * Based on OneVOne handler but adapted for tournament-specific scenarios
 */

import { BaseDisconnectHandler, PlayerStates, DisconnectionReasons, MatchTypes } from '../../server/disconnect/BaseDisconnectHandler.js';
import { gameStateManager } from '../../game/GameStateManager.js';
import { gameEngine } from '../../game/GameEngine.js';
import { LogUtils, TimeUtils } from '../../utils/helpers.js';
import { playerManager } from '../../player/PlayerManager.js';
import { reportMatchResultsToAPI } from '../../server/api.js';
import { GAME_CONFIG } from '../../core/constants.js';
import { TournamentRoomTypes, TournamentPhases } from '../constants.js';
import { tournamentManager } from '../TournamentManager.js';
import { blockchainService } from '../../services/blockchainService.js';

/**
 * Tournament Match Disconnect Handler
 */
export class TournamentMatchDisconnectHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.matchType = MatchTypes.TOURNAMENT;
  }

  /**
   * Handle unexpected disconnection in tournament matches
   */
  async handleDisconnection(playerId, roomId, reason) {
    console.log(`🏆 TOURNAMENT MATCH DISCONNECT: Player ${playerId} from room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`🏆 Room ${roomId} not found for tournament match disconnect handling`);
      this.removePlayerFromGame(playerId);
      return;
    }

    // Verify this is a tournament match room (not waiting room)
    if (!this.isTournamentMatchRoom(room)) {
      console.log(`🏆 Room ${roomId} is not a tournament match room, skipping tournament match handler`);
      return;
    }

    // ⭐ FIX: Check if player is already being processed for disconnection to prevent duplicates
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (waitingRoomId) {
      try {
        const { tournamentManager } = await import('../TournamentManager.js');
        const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
        if (waitingRoomData) {
          const player = waitingRoomData.players.find(p => p.id === playerId);
          if (player && !player.connected) {
            console.log(`🏆 Player ${playerId} already disconnected, skipping duplicate disconnection processing`);
            return;
          }
        }
      } catch (error) {
        console.error(`🏆 Error checking player disconnection status:`, error);
      }
    }

    // ⭐ NEW: Check if this is a legitimate tournament closure
    if (this._isLegitimateTournamentClosure(reason)) {
      console.log(`🏆 Legitimate tournament closure detected for player ${playerId}, skipping forfeit handling`);
      this.removePlayerFromGame(playerId);
      return;
    }

    //TODO: CHECK 3 DISCONNECTED PLAYERS AND 1 CONNECTED PLAYER
    // Clean up player connection first
    this.cleanupPlayerConnection(playerId);
    
    // Get current player state
    const playerState = this.getPlayerState(playerId, roomId);
    
    console.log(`🏆 Tournament match disconnect - Player ${playerId} in state: ${playerState}, room type: ${room.metadata?.roomType}`);
    
    // Handle based on current state
    switch (playerState) {
      case PlayerStates.WAITING:
        await this.handleWaitingStateDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.LOADING:
      case PlayerStates.ANNOUNCEMENT:
      case PlayerStates.LAUNCH_ANIMATION:
        await this.handlePreGameDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.PLAYING:
        await this.handleInGameDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.GAME_OVER:
        await this.handlePostGameDisconnect(playerId, roomId);
        break;
      default:
        console.warn(`🏆 Unknown tournament player state: ${playerState} for player ${playerId}`);
        await this.handleWaitingStateDisconnect(playerId, roomId, reason);
    }
  }

  /**
   * Handle explicit leave game button click in tournament matches
   */
  handleExplicitLeave(playerId, roomId) {
    console.log(`🏃 Tournament match player ${playerId} explicitly leaving tournament match in room ${roomId}`);
    
    // Mark player as leaving
    const player = gameStateManager.getPlayer(playerId);
    if (player) {
      player.isLeaving = true;
    }
    
    // Handle as disconnection with explicit reason
    this.handleDisconnection(playerId, roomId, DisconnectionReasons.PLAYER_LEFT);
  }

  /**
   * Handle disconnection during waiting state in tournament matches
   */
  async handleWaitingStateDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Tournament match waiting state disconnect: Player ${playerId} in room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // Clear wallet cache for disconnected player
    blockchainService.clearUserWalletCache(playerId);

    // DEBUG: Log room state to understand what's happening
    console.log(`🏆 DEBUG: Room ${roomId} state - gameStarted: ${room.gameStarted}, ready: ${room.ready}, players: ${room.players.length}`);
    console.log(`🏆 DEBUG: Room ${roomId} metadata:`, room.metadata);

    // ⭐ FIX: Update tournament disconnection status for WebSocket disconnections
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (waitingRoomId) {
      await this.updateTournamentDisconnectionStatus(waitingRoomId, playerId, true);
    }

    // Check if game has started but is in animation phase
    if (room.gameStarted && room.ready) {
      console.log(`🏆 Tournament match game started but in animation phase, handling as pre-game disconnect`);
      this.handlePreGameDisconnect(playerId, roomId, reason);
      return;
    }

    // Check if this is a tournament match room with both players assigned
    // Even if the game hasn't started yet, if both players were assigned to the match,
    // a disconnect should result in a forfeit win for the remaining player
    if (room.metadata?.roomType && 
        (room.metadata.roomType.includes('semi_final') || 
         room.metadata.roomType.includes('final'))) {
      
      const remainingPlayer = room.players.find(p => p.id !== playerId);
      const disconnectedPlayer = room.players.find(p => p.id === playerId);
      
      if (remainingPlayer && disconnectedPlayer) {
        console.log(`🏆 Tournament match waiting state forfeit: ${remainingPlayer.username} wins, ${disconnectedPlayer.username} disconnected before game start`);
        this.handlePreGameDisconnect(playerId, roomId, reason);
        return;
      }
    }

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    
    console.log(`🏆 Tournament match waiting state: Player ${playerId} removed from room ${roomId} (${room.players.length}/2 remaining)`);
    
    // Handle empty rooms
    if (room.players.length === 0) {
      console.log(`🏆 Tournament match room ${roomId} is empty, removing room`);
      gameStateManager.removeRoom(roomId);
    } else {
      // Notify remaining player
      this.notifyPlayerDisconnected(roomId, playerId, room.players.length);
    }
  }

  /**
   * Handle disconnection during pre-game states in tournament matches
   */
  async handlePreGameDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Tournament match pre-game disconnect: Player ${playerId} in room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in tournament room ${roomId} for pre-game disconnect handling`);
      return;
    }

    console.log(`🏆 Tournament match pre-game forfeit: ${remainingPlayer.username} wins, ${disconnectedPlayer.username} disconnected`);

    // ⭐ FIX: Capture scores before disposing ball
    let winnerScore = null;
    let loserScore = null;
    
    if (room.ball) {
      const isRemainingPlayer1 = remainingPlayer.id === room.players[0].id;
      const isDisconnectedPlayer1 = disconnectedPlayer.id === room.players[0].id;
      
      winnerScore = GAME_CONFIG.WINNING_SCORE; // Winner always gets full score
      loserScore = isDisconnectedPlayer1 ? room.ball.player1.playerScore : room.ball.player2.playerScore;
    }

    // ⭐ CRITICAL FIX: Immediately dispose ball to prevent it from moving during finals
    await this.immediatelyDisposeBall(room, roomId);

    // Award forfeit win and handle tournament advancement with captured scores
    await this.awardTournamentForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'pre_game', winnerScore, loserScore);
  }

  /**
   * Handle disconnection during active gameplay in tournament matches
   */
  async handleInGameDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Tournament match in-game disconnect: Player ${playerId} in room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in tournament room ${roomId} for in-game disconnect handling`);
      return;
    }
    console.log(`🔴 Tournament match in-game forfeit: ${remainingPlayer.username} wins, ${disconnectedPlayer.username} disconnected`);
    
    // ⭐ FIX: Capture scores before disposing ball
    let winnerScore = null;
    let loserScore = null;
    
    if (room.ball) {
      const isRemainingPlayer1 = remainingPlayer.id === room.players[0].id;
      const isDisconnectedPlayer1 = disconnectedPlayer.id === room.players[0].id;
      
      winnerScore = GAME_CONFIG.WINNING_SCORE; // Winner always gets full score
      loserScore = isDisconnectedPlayer1 ? room.ball.player1.playerScore : room.ball.player2.playerScore;
    }
    
    // ⭐ CRITICAL FIX: Immediately dispose ball to prevent it from moving during finals
    await this.immediatelyDisposeBall(room, roomId);

    // Award forfeit win and handle tournament advancement with captured scores
    await this.awardTournamentForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'in_game', winnerScore, loserScore);
  }

  /**
   * Handle disconnection after game is over in tournament matches
   */
  async handlePostGameDisconnect(playerId, roomId) {
    console.log(`🏆 Tournament match post-game disconnect: Player ${playerId} in room ${roomId}`);
    
    // ⭐ FIX: Update tournament disconnection status for WebSocket disconnections
    const room = gameStateManager.getRoom(roomId);
    const waitingRoomId = room?.metadata?.waitingRoomId;
    if (waitingRoomId) {
      await this.updateTournamentDisconnectionStatus(waitingRoomId, playerId, true);
    }
    
    // Just clean up, no special handling needed
    this.removePlayerFromGame(playerId);
    
    if (room && room.players.length === 0) {
      console.log(`🏆 Tournament match room ${roomId} is empty after post-game disconnect, removing room`);
      gameStateManager.removeRoom(roomId);
    }
  }

  /**
   * Award forfeit win to remaining player in tournament matches
   */
  async awardTournamentForfeitWin(room, roomId, winner, loser, reason, context, winnerScore = null, loserScore = null) {
    console.log(`🏆 Awarding tournament forfeit win: ${winner.username} defeats ${loser.username} in ${room.metadata?.roomType}`);
    
    // Update disconnection tracking in waiting room data
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (waitingRoomId) {
      await this.updateTournamentDisconnectionStatus(waitingRoomId, loser.id, true);
    }
    
    // Check for singleInEachFinals scenario before creating match data
    const singleInEachFinals = await this.checkSingleInEachFinalsScenario(waitingRoomId);
    
    if (singleInEachFinals) {
      console.log(`🏆 Single in each finals scenario detected - handling both players`);
      await this.handleSingleInEachFinalsScenario(room, roomId, winner, loser, reason, context);
      return;
    }
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create tournament match data
    const matchData = await this.createTournamentForfeitMatchData(room, roomId, winner, loser, reason, context, winnerScore, loserScore);
    
    // Log the tournament forfeit
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    this.reportTournamentForfeitResults(matchData);
    
    // Handle tournament advancement
    this.handleTournamentAdvancement(room, roomId, matchData);
    
    // Notify remaining player
    this.notifyTournamentForfeitWin(roomId, matchData);
    
    // Schedule cleanup
    this.scheduleTournamentRoomCleanup(roomId, 5000);
  }

  /**
   * Check if we're in the singleInEachFinals scenario
   */
  async checkSingleInEachFinalsScenario(waitingRoomId) {
    if (!waitingRoomId) return false;
    
    try {
      const { tournamentManager } = await import('../TournamentManager.js');
      const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
      if (!waitingRoomData) return false;
      
      const numberOfDisconnectedPlayers = waitingRoomData.disconnectedPlayers.length;
      const numberOfConnectedPlayers = waitingRoomData.players.filter(p => p.connected).length;
      
      // Get winner final room from tournament data
      const winnerFinal = waitingRoomData.tournamentRooms.winnerFinal;
      const winnerFinalRoom = winnerFinal ? gameStateManager.getRoom(winnerFinal.id) : null;
      const winnerFinalPlayerCount = winnerFinalRoom ? winnerFinalRoom.players.length : 0;
      
      // Get loser final room from tournament data
      const loserFinal = waitingRoomData.tournamentRooms.loserFinal;
      const loserFinalRoom = loserFinal ? gameStateManager.getRoom(loserFinal.id) : null;
      const loserFinalPlayerCount = loserFinalRoom ? loserFinalRoom.players.length : 0;
      
      return Boolean(numberOfConnectedPlayers === 2 && winnerFinalPlayerCount === 0 &&
        loserFinalPlayerCount === 1 && numberOfDisconnectedPlayers === 2);
    } catch (error) {
      console.error(`🏆 Error checking singleInEachFinals scenario:`, error);
      return false;
    }
  }

  /**
   * Handle the singleInEachFinals scenario - assign 1st and 3rd place
   */
  async handleSingleInEachFinalsScenario(room, roomId, forfeitWinner, forfeitLoser, reason, context) {
    console.log(`🏆 Handling singleInEachFinals scenario - assigning 1st and 3rd place`);
    
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (!waitingRoomId) {
      console.error(`🏆 No waiting room ID for singleInEachFinals scenario`);
      return;
    }
    
    try {
      const { tournamentManager } = await import('../TournamentManager.js');
      const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
      if (!waitingRoomData) {
        console.error(`🏆 No waiting room data for singleInEachFinals scenario`);
        return;
      }
      
      // Find the waiting loser in the loser final room
      const loserFinal = waitingRoomData.tournamentRooms.loserFinal;
      const loserFinalRoom = loserFinal ? gameStateManager.getRoom(loserFinal.id) : null;
      const waitingLoser = loserFinalRoom && loserFinalRoom.players.length === 1 ? loserFinalRoom.players[0] : null;
      
      if (!waitingLoser) {
        console.error(`🏆 Could not find waiting loser in loser final room`);
        return;
      }
      
      console.log(`🏆 Found waiting loser: ${waitingLoser.username} (${waitingLoser.id})`);
      
      // Create match data for forfeit winner (1st place)
      const winnerMatchData = await this.createTournamentForfeitMatchData(room, roomId, forfeitWinner, forfeitLoser, reason, context, null, null);
      
      // Create match data for waiting loser (3rd place)
      const thirdPlaceMatchData = await this.createTournamentThirdPlaceMatchData(room, roomId, waitingLoser, reason, context);
      
      // Send messages sequentially to avoid race conditions
      
      // 1. Send winner message first (1st place)
      console.log(`🏆 Sending 1st place message to forfeit winner: ${forfeitWinner.username}`);
      await this.sendTournamentCompletionMessage(forfeitWinner, winnerMatchData, 'winner_final');
      
      // 2. Send loser message second (3rd place)
      console.log(`🏆 Sending 3rd place message to waiting loser: ${waitingLoser.username}`);
      await this.sendTournamentCompletionMessage(waitingLoser, thirdPlaceMatchData, 'loser_final');
      
      // 3. Close both connections
      console.log(`🏆 Closing connections for both players`);
      if (forfeitWinner.ws && forfeitWinner.ws.readyState === 1) {
        forfeitWinner.ws.close(1000, 'Tournament placement determined - 1st place');
      }
      if (waitingLoser.ws && waitingLoser.ws.readyState === 1) {
        waitingLoser.ws.close(1000, 'Tournament placement determined - 3rd place');
      }
      
      // 4. Update tournament state
      await this.updateTournamentDisconnectionStatus(waitingRoomId, forfeitWinner.id, true);
      await this.updateTournamentDisconnectionStatus(waitingRoomId, waitingLoser.id, true);
      
      // 5. Log both match completions
      LogUtils.logMatchCompletion(winnerMatchData);
      LogUtils.logMatchCompletion(thirdPlaceMatchData);
      
      // 6. Report results to external APIs
      this.reportTournamentForfeitResults(winnerMatchData);
      this.reportTournamentForfeitResults(thirdPlaceMatchData);
      
      // 7. Store tournament results
      if (!waitingRoomData.finalResults) {
        waitingRoomData.finalResults = {};
      }
      waitingRoomData.finalResults['winner_final'] = { 
        winner: forfeitWinner, 
        loser: forfeitWinner, 
        isForfeit: true 
      };
      waitingRoomData.finalResults['loser_final'] = { 
        winner: waitingLoser, 
        loser: waitingLoser, 
        isForfeit: true 
      };
      
      // 8. Clean up game state and rooms
      console.log(`🏆 Cleaning up game state and rooms for singleInEachFinals scenario`);
      
      // Mark the current room as game over
      room.isGameOver = true;
      
      // Immediately dispose ball to prevent movement
      await this.immediatelyDisposeBall(room, roomId);
      
      // Clean up both players from the game
      this.cleanupPlayerConnection(forfeitWinner.id);
      this.cleanupPlayerConnection(waitingLoser.id);
      
      // Remove players from their respective rooms
      if (room.players) {
        room.players = room.players.filter(p => p.id !== forfeitWinner.id && p.id !== forfeitLoser.id);
      }
      
      // Clean up loser final room if it exists
      if (loserFinalRoom && loserFinalRoom.players) {
        loserFinalRoom.players = loserFinalRoom.players.filter(p => p.id !== waitingLoser.id);
      }
      
      // Schedule cleanup for both rooms
      this.scheduleTournamentRoomCleanup(roomId, 5000);
      if (loserFinal && loserFinal.id !== roomId) {
        this.scheduleTournamentRoomCleanup(loserFinal.id, 5000);
      }
      
      // 9. Send tournament completion message to all players
      try {
        tournamentManager.communicationManager._sendTournamentCompletionMessage(waitingRoomId, winnerMatchData);
        console.log(`🏆 Tournament completion message sent to all players`);
      } catch (error) {
        console.error(`🏆 Error sending tournament completion message:`, error);
      }
      
      // 10. Mark tournament as finished and schedule full cleanup
      waitingRoomData.phase = 'FINISHED';
      
      // Schedule full tournament cleanup after a delay to allow players to see results
      setTimeout(() => {
        try {
          tournamentManager.cleanupManager.cleanupWaitingRoom(waitingRoomId);
          console.log(`🏆 Full tournament cleanup scheduled for waiting room ${waitingRoomId}`);
        } catch (error) {
          console.error(`🏆 Error scheduling full tournament cleanup:`, error);
        }
      }, 10000); // 10 seconds delay to allow players to see results
      
      console.log(`🏆 SingleInEachFinals scenario completed successfully`);
      
    } catch (error) {
      console.error(`🏆 Error handling singleInEachFinals scenario:`, error);
    }
  }

  /**
   * Send tournament completion message to a player
   */
  async sendTournamentCompletionMessage(player, matchData, tournamentPhase) {
    if (!player.ws || player.ws.readyState !== 1) {
      console.error(`🏆 Player ${player.username} WebSocket not ready for completion message`);
      return;
    }
    
    try {
      // Get waiting room data to check for disconnections
      const waitingRoomId = matchData.waitingRoomId;
      let isDisrupted = false;
      
      if (waitingRoomId) {
        try {
          const { tournamentManager } = await import('../TournamentManager.js');
          const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
          isDisrupted = waitingRoomData ? waitingRoomData.hasDisconnections : false;
        } catch (error) {
          console.error(`🏆 Error getting tournament disruption status:`, error);
        }
      }
      
      const message = {
        type: 'tournamentAdvancement',
        status: 'final_match_complete',
        playerPlacement: tournamentPhase === 'winner_final' ? 1 : 3,
        isWinner: tournamentPhase === 'winner_final',
        opponentName: 'Tournament',
        isDisrupted: isDisrupted, // ⭐ FIX: Include disruption status for proper splash screen styling
        message: tournamentPhase === 'winner_final' 
          ? '🏆 Tournament complete! You are the CHAMPION! 🥇'
          : '🏆 Tournament complete! You finished 3rd place!',
        showSplashScreen: tournamentPhase === 'winner_final',
        matchData: matchData
      };
      
      player.ws.send(JSON.stringify(message));
      console.log(`🏆 Sent ${tournamentPhase} completion message to ${player.username}`);
    } catch (error) {
      console.error(`🏆 Failed to send completion message to ${player.username}:`, error);
    }
  }

  /**
   * Create match data for tournament forfeit scenarios
   */
  async createTournamentForfeitMatchData(room, roomId, winner, loser, reason, context, winnerScore = null, loserScore = null) {
    // Get tournament waiting room data for accurate player counts
    const waitingRoomId = room.metadata?.waitingRoomId;
    let numberOfDisconnectedPlayers = 0;
    let numberOfConnectedPlayers = 0;
    let winnerFinalRoom = null;
    let loserFinalRoom = null;
    let winnerFinalExists = false;
    let loserFinalExists = false;
    let winnerFinalPlayerCount = 0;
    let loserFinalPlayerCount = 0;
    
    if (waitingRoomId) {
      try {
        const { tournamentManager } = await import('../TournamentManager.js');
        const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
        if (waitingRoomData) {
          numberOfDisconnectedPlayers = waitingRoomData.disconnectedPlayers.length;
          numberOfConnectedPlayers = waitingRoomData.players.filter(p => p.connected).length;
          
          // Get winner final room from tournament data
          const winnerFinal = waitingRoomData.tournamentRooms.winnerFinal;
          if (winnerFinal) {
            winnerFinalRoom = gameStateManager.getRoom(winnerFinal.id);
            winnerFinalExists = !!winnerFinalRoom;
            winnerFinalPlayerCount = winnerFinalRoom ? winnerFinalRoom.players.length : 0;
          }
          // Get loser final room from tournament data
          const loserFinal = waitingRoomData.tournamentRooms.loserFinal;
          if (loserFinal) {
            loserFinalRoom = gameStateManager.getRoom(loserFinal.id);
            loserFinalExists = !!loserFinalRoom;
            loserFinalPlayerCount = loserFinalRoom ? loserFinalRoom.players.length : 0;
          }
        }
      } catch (error) {
        console.error(`🏆 Error getting tournament player counts:`, error);
      }
    }
    
    const matchEndTime = TimeUtils.getCurrentTimestamp();
    const isSinglePlayerForfeitSemi = Boolean(numberOfDisconnectedPlayers === 3 && numberOfConnectedPlayers === 1);
    if (isSinglePlayerForfeitSemi) {
      if (loserFinalPlayerCount == 2) {
        room.metadata.tournamentPhase = 'loser_final';
        room.metadata.roomType = 'loser_final';
      }
      else {
        room.metadata.tournamentPhase = 'winner_final';
        room.metadata.roomType = 'winner_final';
      }
    }
    const matchStartTime = room.startTime || matchEndTime;
    
    // ⭐ FIX: Use tournament start timestamp for tournament matches instead of real end time
    let endTimestamp;
    if (waitingRoomId) {
      try {
        const { blockchainService } = await import('../../services/blockchainService.js');
        const tournamentStartTime = blockchainService.getTournamentStartTime(waitingRoomId);
        endTimestamp = tournamentStartTime || Math.floor(Date.now() / 1000);
        console.log(`🏆 Using tournament start timestamp ${endTimestamp} for forfeit match in room ${roomId}`);
      } catch (error) {
        console.error(`🏆 Error getting tournament start time, using current time:`, error);
        endTimestamp = Math.floor(Date.now() / 1000);
      }
    } else {
      endTimestamp = Math.floor(Date.now() / 1000);
    }
    
    // ⭐ FIX: Use provided scores or calculate correct scores based on player positions
    let finalWinnerScore = winnerScore;
    let finalLoserScore = loserScore;
    
    if (finalWinnerScore === null || finalLoserScore === null) {
      // Calculate scores based on which player is which
      if (room.ball) {
        const isWinnerPlayer1 = winner.id === room.players[0].id;
        const isLoserPlayer1 = loser.id === room.players[0].id;
        
        finalWinnerScore = finalWinnerScore ?? GAME_CONFIG.WINNING_SCORE; // Winner always gets full score
        finalLoserScore = finalLoserScore ?? ((isLoserPlayer1 ? room.ball.player1.playerScore : room.ball.player2.playerScore) || 0);
      } else {
        finalWinnerScore = finalWinnerScore ?? GAME_CONFIG.WINNING_SCORE;
        finalLoserScore = finalLoserScore ?? 0;
      }
    }
    
    // Generate simple match ID for internal tracking
    const matchId = Math.floor(Date.now() / 1000) % 1000000;
    console.log(`🎯 Generated simple match ID ${matchId} for tournament forfeit in room ${roomId}`);
    
    return {
      roomId,
      matchId, // Add the generated match ID
      matchType: this.matchType,
      tournamentPhase: (isSinglePlayerForfeitSemi  ? 'winner_final' : room.metadata?.tournamentPhase),
      tournamentRoomType: (isSinglePlayerForfeitSemi ? 'winner_final' : room.metadata?.tournamentPhase),
      waitingRoomId: room.metadata?.waitingRoomId,
      matchStartTime,
      matchEndTime,
      endTimestamp, // Add actual end timestamp as integer for blockchain
      matchDuration: TimeUtils.calculateMatchDuration(matchStartTime, matchEndTime),
      winner: {
        id: winner.id,
        userId: winner.userId, // Include real user ID for blockchain operations
        username: winner.username || 'Anonymous',
        score: finalWinnerScore
      },
      loser: {
        id: loser.id,
        userId: loser.userId, // Include real user ID for blockchain operations
        username: loser.username || 'Anonymous',
        score: finalLoserScore
      },
      gameStats: {
        totalRebounds: room.ball?.rebounds || 0,
        finalScore: `${finalWinnerScore}-${finalLoserScore}`,
        ballSpeed: room.ball?.speed || 0,
        lastHitBy: room.ball?.wasHitByPlayer || null,
        forfeitReason: this.getTournamentForfeitReasonText(reason, context, room.metadata?.roomType),
        disconnectionType: reason,
        context: context,
        tournamentPhase: isSinglePlayerForfeitSemi ? 'winner_final' : room.metadata?.tournamentPhase,
      },
      matchType: 'tournament_forfeit',
      disconnectionReason: reason,
      serverTime: Date.now()
    };
  }

  /**
   * Create match data for tournament third place scenarios
   */
  async createTournamentThirdPlaceMatchData(room, roomId, waitingLoser, reason, context) {
    const matchEndTime = TimeUtils.getCurrentTimestamp();
    const matchStartTime = room.startTime || matchEndTime;
    // ⭐ FIX: Use tournament start timestamp for tournament matches instead of real end time
    let endTimestamp;
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (waitingRoomId) {
      try {
        const { blockchainService } = await import('../../services/blockchainService.js');
        const tournamentStartTime = blockchainService.getTournamentStartTime(waitingRoomId);
        endTimestamp = tournamentStartTime || Math.floor(Date.now() / 1000);
        console.log(`🏆 Using tournament start timestamp ${endTimestamp} for third place match in room ${roomId}`);
      } catch (error) {
        console.error(`🏆 Error getting tournament start time, using current time:`, error);
        endTimestamp = Math.floor(Date.now() / 1000);
      }
    } else {
      endTimestamp = Math.floor(Date.now() / 1000);
    }
    
    // Generate simple match ID for internal tracking
    const matchId = Math.floor(Date.now() / 1000) % 1000000;
    console.log(`🎯 Generated simple match ID ${matchId} for tournament third place in room ${roomId}`);
    
    return {
      roomId,
      matchId, // Add the generated match ID
      matchType: this.matchType,
      tournamentPhase: 'loser_final',
      tournamentRoomType: 'loser_final',
      waitingRoomId: room.metadata?.waitingRoomId,
      matchStartTime,
      matchEndTime,
      endTimestamp, // Add actual end timestamp as integer for blockchain
      matchDuration: TimeUtils.calculateMatchDuration(matchStartTime, matchEndTime),
      winner: {
        id: waitingLoser.id,
        userId: waitingLoser.userId, // Include real user ID for blockchain operations
        username: waitingLoser.username || 'Anonymous',
        score: 1 // 3rd place gets 1 point instead of 0
      },
      loser: {
        id: waitingLoser.id,
        userId: waitingLoser.userId, // Include real user ID for blockchain operations
        username: waitingLoser.username || 'Anonymous',
        score: 1 // 3rd place gets 1 point instead of 0
      },
      gameStats: {
        totalRebounds: 0,
        finalScore: '1-1',
        ballSpeed: 0,
        lastHitBy: null,
        forfeitReason: this.getTournamentForfeitReasonText(reason, context, 'loser_final'),
        disconnectionType: reason,
        context: context,
        tournamentPhase: 'loser_final',
      },
      matchType: 'tournament_forfeit',
      disconnectionReason: reason,
      serverTime: Date.now()
    };
  }

  /**
   * Get human-readable tournament forfeit reason
   */
  getTournamentForfeitReasonText(reason, context, roomType) {
    const contextText = context === 'pre_game' ? 'before the match started' : 'during the match';
    const roomTypeText = this.getRoomTypeDisplayName(roomType);
    
    switch (reason) {
      case DisconnectionReasons.PLAYER_LEFT:
        return `Player left ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.BROWSER_REFRESH:
        return `Player refreshed browser ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.BROWSER_NAVIGATION:
        return `Player navigated away ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.BROWSER_CLOSE:
        return `Player closed browser ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.NETWORK_DISCONNECT:
        return `Player lost connection ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.TIMEOUT:
        return `Player timed out ${contextText} in ${roomTypeText}`;
      default:
        return `Player disconnected ${contextText} in ${roomTypeText}`;
    }
  }

  /**
   * Get display name for tournament room type
   */
  getRoomTypeDisplayName(roomType) {
    switch (roomType) {
      case TournamentRoomTypes.SEMI_FINAL_A:
        return 'Semi-Final A';
      case TournamentRoomTypes.SEMI_FINAL_B:
        return 'Semi-Final B';
      case TournamentRoomTypes.WINNER_FINAL:
        return 'Winner Final';
      case TournamentRoomTypes.LOSER_FINAL:
        return 'Loser Final';
      default:
        return 'Tournament Match';
    }
  }

  /**
   * Handle tournament advancement after forfeit
   */
  async handleTournamentAdvancement(room, roomId, matchData) {
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (!waitingRoomId) {
      console.error(`🏆 No waiting room ID found for tournament advancement in room ${roomId}`);
      return;
    }

    console.log(`🏆 Handling tournament advancement for room ${roomId} in tournament ${waitingRoomId}`);

    try {
      // Import tournament manager dynamically to avoid circular dependencies
      const { tournamentManager } = await import('../TournamentManager.js');
      
      const roomType = room.metadata?.roomType;
      if (roomType === TournamentRoomTypes.SEMI_FINAL_A || roomType === TournamentRoomTypes.SEMI_FINAL_B) {
        console.log(`🏆 Semi-final forfeit detected, advancing winner to finals`);
        await tournamentManager.handleSemiFinalMatchEnd(waitingRoomId, roomId, matchData);
      } else if (roomType === TournamentRoomTypes.WINNER_FINAL || roomType === TournamentRoomTypes.LOSER_FINAL) {
        console.log(`🏆 Final forfeit detected, completing tournament`);
        await tournamentManager.handleFinalMatchEnd(waitingRoomId, roomId, matchData);
      } else {
        console.error(`🏆 Unknown tournament room type for advancement: ${roomType}`);
      }
    } catch (error) {
      console.error(`🏆 Error handling tournament advancement:`, error);
    }
  }

  /**
   * Clean up player connection in tournament matches
   */
  cleanupPlayerConnection(playerId) {
    console.log(`🏆 Cleaning up tournament player connection for ${playerId}`);
    
    const player = gameStateManager.getPlayer(playerId);
    
    if (player && player.ws) {
      this.cleanupWebSocket(player.ws);
    }
    
    this.removePlayerFromGame(playerId);
  }

  /**
   * Update disconnection status in tournament waiting room data
   */
  async updateTournamentDisconnectionStatus(waitingRoomId, playerId, disconnected = true) {
    try {
      // Import tournament manager dynamically to avoid circular dependencies
      const { tournamentManager } = await import('../TournamentManager.js');
      
      const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
      if (!waitingRoomData) return;

      // Check if player is already in the correct state to prevent duplicate tracking
      const player = waitingRoomData.players.find(p => p.id === playerId);
      if (player && player.connected === !disconnected) {
        console.log(`🏆 Player ${playerId} already has correct disconnection status (${disconnected}), skipping update`);
        return;
      }

      // ⭐ FIX: Additional check for duplicate disconnection processing
      if (disconnected && waitingRoomData.disconnectedPlayers.includes(playerId)) {
        console.log(`🏆 Player ${playerId} already in disconnected players array, skipping duplicate update`);
        return;
      }

      if (player) {
        player.connected = !disconnected;
        player.disconnectedAt = disconnected ? Date.now() : null;
      }

      const playerStatus = waitingRoomData.playerStatus.get(playerId);
      if (playerStatus) {
        playerStatus.connected = !disconnected;
        playerStatus.disconnectedAt = disconnected ? Date.now() : null;
      }

      // Update disconnected players array
      if (disconnected && !waitingRoomData.disconnectedPlayers.includes(playerId)) {
        waitingRoomData.disconnectedPlayers.push(playerId);
        // ⭐ NEW: Set tournament-wide disconnection flag
        waitingRoomData.hasDisconnections = true;
        console.log(`🏆 Tournament ${waitingRoomId} marked as disrupted due to player ${playerId} disconnection`);
      } else if (!disconnected) {
        waitingRoomData.disconnectedPlayers = waitingRoomData.disconnectedPlayers.filter(id => id !== playerId);
      }

      console.log(`#### 🏆 Updated tournament disconnection status for player ${playerId}: disconnected=${disconnected}`);
      console.log(`#### 🏆 Tournament ${waitingRoomId} - Connected: ${waitingRoomData.players.filter(p => p.connected).length}, Disconnected: ${waitingRoomData.disconnectedPlayers.length}`);
    } catch (error) {
      console.error(`🏆 Error updating tournament disconnection status:`, error);
    }
  }

  /**
   * Report tournament forfeit results to external APIs
   */
  async reportTournamentForfeitResults(matchData) {
    try {
      console.log(`🏆 Collecting tournament forfeit match for room ${matchData.roomId}`);
      // Collect match data for tournament reporting (NEW: collect instead of report individually)
      const tournamentId = matchData.waitingRoomId;
      
      // Add match to tournament collection
      const { tournamentManager } = await import('../TournamentManager.js');
      await tournamentManager.addTournamentMatch(tournamentId, matchData);
    } catch (error) {
      console.error('🏆 Failed to collect tournament forfeit match:', error);
    }
  }

  /**
   * Notify remaining player of tournament forfeit win
   */
  notifyTournamentForfeitWin(roomId, matchData) {
    console.log(`🏆 Notifying tournament forfeit win in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.error(`🏆 Room ${roomId} not found for forfeit win notification`);
      return;
    }

    const remainingPlayer = room.players.find(p => p.id !== matchData.loser.id);
    if (!remainingPlayer || !remainingPlayer.ws || remainingPlayer.ws.readyState !== 1) {
      console.error(`🏆 Remaining player not found or not connected for forfeit win notification`);
      return;
    }

    // Send tournament advancement message to trigger proper frontend cleanup
    const advancementMessage = {
      type: 'tournamentAdvancement',
      status: 'transferred_to_final',
      finalType: room.metadata?.roomType === 'semi_final_a' || room.metadata?.roomType === 'semi_final_b' ? 'winner' : 'loser',
      message: '🎉 You advanced to the final due to opponent disconnect!',
      matchData: matchData
    };

    try {
      remainingPlayer.ws.send(JSON.stringify(advancementMessage));
      console.log(`🏆 Sent tournament advancement message to ${remainingPlayer.username} for forfeit win`);
    } catch (error) {
      console.error(`🏆 Failed to send tournament advancement message to ${remainingPlayer.username}:`, error);
    }
  }

  /**
   * Notify players of a disconnection in tournament matches (non-game scenario)
   */
  notifyPlayerDisconnected(roomId, disconnectedPlayerId, remainingPlayerCount) {
    console.log(`🏆 Notifying tournament match disconnect: Player ${disconnectedPlayerId} left, ${remainingPlayerCount} remaining`);
    
    gameEngine.broadcastToRoom(roomId, {
      type: 'playerDisconnected',
      playerId: disconnectedPlayerId,
      remainingPlayers: remainingPlayerCount,
      isTournamentMatch: true
    });
  }

  /**
   * Schedule tournament room cleanup with delay
   */
  scheduleTournamentRoomCleanup(roomId, delayMs = 5000) {
    console.log(`🏆 Scheduling tournament room cleanup for ${roomId} in ${delayMs}ms`);
    
    setTimeout(() => {
      const room = gameStateManager.getRoom(roomId);
      if (room) {
        console.log(`🏆 Cleaning up tournament room ${roomId}`);
        gameStateManager.removeRoom(roomId);
      }
    }, delayMs);
  }

  /**
   * Handle player state update from client in tournament matches
   */
  handlePlayerStateUpdate(playerId, roomId, state) {
    if (Object.values(PlayerStates).includes(state)) {
      this.setPlayerState(playerId, roomId, state);
      this.updatePlayerActivity(playerId);
      console.log(`🏆 Tournament player state update: ${playerId} -> ${state} in room ${roomId}`);
    } else {
      console.warn(`🏆 Invalid tournament player state: ${state} for player ${playerId}`);
    }
  }

  /**
   * Handle browser events for tournament matches
   */
  handleBrowserEvent(playerId, roomId, eventType) {
    console.log(`🌐 Tournament match browser event: ${eventType} for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🏆 Room ${roomId} not found for tournament match browser event handling`);
      return;
    }

    // Verify this is a tournament match room
    if (!this.isTournamentMatchRoom(room)) {
      console.log(`🏆 Room ${roomId} is not a tournament match room, skipping browser event handling`);
      return;
    }

    let reason;
    switch (eventType) {
      case 'beforeunload':
      case 'pagehide':
      case 'unload':
      case 'popstate':
      case 'visibility_timeout':
        reason = 'browser_navigation';
        break;
      case 'visibilitychange':
        // Don't treat visibility change as disconnect
        return;
      default:
        reason = 'browser_event';
    }

    console.log(`🏆 Tournament match browser event: ${eventType} for player ${playerId} -> ${reason}`);
    this.handleDisconnection(playerId, roomId, reason);
  }

  /**
   * Check if room is a tournament match room (not waiting room)
   */
  isTournamentMatchRoom(room) {
    if (!room || room.matchType !== 'tournament') {
      return false;
    }

    const roomType = room.metadata?.roomType;
    return roomType === TournamentRoomTypes.SEMI_FINAL_A ||
           roomType === TournamentRoomTypes.SEMI_FINAL_B ||
           roomType === TournamentRoomTypes.WINNER_FINAL ||
           roomType === TournamentRoomTypes.LOSER_FINAL;
  }

  /**
   * Get tournament match statistics
   */
  getTournamentMatchStats() {
    return {
      activeTournamentMatches: this.getActiveTournamentMatchCount(),
      connectionStats: this.getConnectionStats(),
      handlerType: 'tournament_match'
    };
  }

  /**
   * Get count of active tournament matches
   */
  getActiveTournamentMatchCount() {
    let count = 0;
    const rooms = gameStateManager.getAllRooms();
    
    for (const room of rooms) {
      if (this.isTournamentMatchRoom(room)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * ⭐ CRITICAL FIX: Immediately dispose ball to prevent movement during finals
   */
  async immediatelyDisposeBall(room, roomId) {
    console.log(`🏆 Immediately disposing ball for room ${roomId} due to disconnect`);
    
    if (room.ball) {
      // Stop ball movement by setting velocity to zero
      if (room.ball.velocity) {
        room.ball.velocity.set(0, 0, 0);
        console.log(`🏆 Ball velocity set to zero for room ${roomId}`);
      }
      if (room.ball.previousVelocity) {
        room.ball.previousVelocity.set(0, 0, 0);
      }
      
      // Reset ball state to prevent respawning
      room.ball.isRespawning = false;
      room.ball.respawnTime = 0;
      room.ball.hasValidPosition = false;
      
      // Clear ball references to prevent memory leaks
      room.ball.gameEngine = null;
      room.ball.roomId = null;
      
      // ⭐ CRITICAL: Nullify the ball object to stop all movement immediately
      room.ball = null;
      
      console.log(`🏆 Ball object immediately nullified for room ${roomId}`);
    }
    
    // ⭐ CRITICAL FIX: Set flag to prevent ball recreation
    room.ballDisposed = true;
    console.log(`🏆 Ball disposal flag set for room ${roomId}`);
    
    // ⭐ CRITICAL FIX: Send final sync message with ballState: null to explicitly stop client processing
    try {
      // Import gameEngine dynamically to avoid circular dependencies
      const { gameEngine } = await import('../../game/GameEngine.js');
      gameEngine.broadcastToRoom(roomId, {
        type: 'sync',
        playerPositions: {},
        ballState: null,
        serverTime: Date.now(),
        roomId: roomId,
        isDelta: true,
        ballDisposed: true // ⭐ NEW: Flag to indicate ball has been disposed
      });
      console.log(`🏆 Sent final sync message with ballState: null for room ${roomId}`);
    } catch (error) {
      console.error(`🏆 Error sending final sync message for room ${roomId}:`, error);
    }
    
    // Clear ball update flags
    room.ballUpdateSent = false;
    if (room.ballUpdateTimeout) {
      clearTimeout(room.ballUpdateTimeout);
      room.ballUpdateTimeout = null;
      console.log(`🏆 Ball update timeout cleared for room ${roomId}`);
    }
    
    console.log(`🏆 Immediate ball disposal completed for room ${roomId}`);
  }

  /**
   * ⭐ NEW: Check if disconnection reason indicates legitimate tournament closure
   */
  _isLegitimateTournamentClosure(reason) {
    // Check for legitimate tournament closure reasons
    const legitimateReasons = [
      'Tournament completed',
      'Tournament completed - 1st place',
      'Tournament completed - 2nd place', 
      'Tournament completed - 3rd place',
      'Tournament completed - 4th place',
      'Tournament placement determined',
      'Tournament placement determined - 1st place',
      'Tournament placement determined - 2nd place',
      'Tournament placement determined - 3rd place',
      'Tournament placement determined - 4th place',
      'Tournament cleanup'
    ];
    
    // Check if the reason indicates legitimate tournament completion
    if (reason && legitimateReasons.some(legitReason => reason.includes(legitReason))) {
      return true;
    }
    
    // Also check for tournament-related reasons
    if (reason && reason.toLowerCase().includes('tournament')) {
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
export const tournamentMatchDisconnectHandler = new TournamentMatchDisconnectHandler(); 