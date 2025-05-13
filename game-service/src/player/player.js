import * as BABYLON from '@babylonjs/core';

class playerPaddle {
  constructor(playerName, playerId, role) {
    this.playerName = playerName;
    this.playerId = playerId;
    this.role = role; // Store role (0 or 1) for color and logic
    this.hasPowerup = false;
    this.playerRebounds = 0;
    this.isWinner = undefined;
    this.poweupType = undefined;
    this.paddleBody = undefined;
    this.playerPov = undefined;
    this.paddleSpeed = undefined;
    this.paddleMaterial = undefined;
    this.playerScore = 0;
  }

  createPaddle(scene, posX, posY, paddleSpeed) {
    this.paddleBody = BABYLON.MeshBuilder.CreateBox(this.playerName, { width: 1, height: 4, depth: 5 }, scene);
    this.paddleBody.position.x = posX;
    this.paddleBody.position.y = posY;
    this.paddleSpeed = paddleSpeed;
    this.paddleColor();
  }

  paddleColor() {
    this.paddleMaterial = new BABYLON.StandardMaterial(this.playerName + '_material', this.scene);
    this.paddleBody.material = this.paddleMaterial;
    if (this.role === 0) {
      this.paddleMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue for role 0
      //console.log(`Set paddle ${this.playerId} (role=${this.role}) to blue`);
    } else {
      this.paddleMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red for role 1
      //console.log(`Set paddle ${this.playerId} (role=${this.role}) to red`);
    }
    this.paddleMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  }

  move(direction, deltaTime) {
    if (this.paddleBody) {
      // Move paddle: direction (-1 = up, 1 = down), speed in units/s, deltaTime in seconds
      const newZ = this.paddleBody.position.z + direction * this.paddleSpeed * deltaTime;
      this.setZ(newZ);
    }
  }

  setZ(newZ) {
    if (this.paddleBody) {
      // Keep paddle fully within z = ±10 (playground depth/2), accounting for paddle depth (5/2 = 2.5)
      this.paddleBody.position.z = Math.max(-7.5, Math.min(7.5, newZ));
      //console.log(`Updated paddle ${this.playerId} to Z=${this.paddleBody.position.z}`);
    }
  }

  getPlayerId() {
    return this.playerId; // Return UUID
  }

  get getPaddleBody() {
    return this.paddleBody;
  }

  get getPaddleBodyPos() {
    return this.paddleBody.position;
  }

  get getWinnerState() {
    return this.isWinner;
  }

  get getPlayerScore() {
    return this.playerScore;
  }

  get getPlayerRebounds() {
    return this.playerRebounds;
  }

  set playerWinner(winner) {
    this.isWinner = winner;
  }

  incrementPlayerRebounds() {
    this.playerRebounds += 1;
  }
}

export { playerPaddle };