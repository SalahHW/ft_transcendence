import * as BABYLON from '@babylonjs/core';

class playerPaddle {
  public playerName: string;
  public playerId: string;
  public role: number;
  public tournament: boolean;
  public hasPowerup: boolean;
  public playerRebounds: number;
  public isWinner: boolean | undefined;
  public powerUpType: string | undefined;
  public paddleBody: BABYLON.Mesh | undefined;
  public playerPov: BABYLON.Camera | undefined;
  public paddleSpeed: number | undefined;
  public paddleMaterial: BABYLON.StandardMaterial | undefined;
  public playerScore: number;
  private scene: BABYLON.Scene | undefined;

  constructor(playerName: string, playerId: string, role: number) {
    this.playerName = playerName;
    this.playerId = playerId;
    this.role = role;
    this.hasPowerup = false;
    this.tournament = false;
    this.playerRebounds = 0;
    this.isWinner = undefined;
    this.powerUpType = undefined;
    this.paddleBody = undefined;
    this.playerPov = undefined;
    this.paddleSpeed = undefined;
    this.paddleMaterial = undefined;
    this.playerScore = 0;
  }

  createPaddle(scene: BABYLON.Scene, posX: number, posY: number, paddleSpeed: number): void {
    this.scene = scene;
    this.paddleBody = BABYLON.MeshBuilder.CreateBox(this.playerName, { width: 1, height: 4, depth: 5 }, scene);
    this.paddleBody.position.x = posX;
    this.paddleBody.position.y = posY;
    this.paddleSpeed = paddleSpeed;
    this.paddleColor();
  }

  paddleColor(): void {
    if (!this.paddleBody || !this.scene) return;
    
    this.paddleMaterial = new BABYLON.StandardMaterial(this.playerName + '_material', this.scene);
    this.paddleBody.material = this.paddleMaterial;
    if (this.role === 0) {
      this.paddleMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue for role 0
    } else {
      this.paddleMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red for role 1
    }
    this.paddleMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  }

  move(direction: number, deltaTime: number): void {
    if (this.paddleBody && this.paddleSpeed) {
      const newZ = this.paddleBody.position.z + direction * this.paddleSpeed * deltaTime;
      this.setZ(newZ);
    }
  }

  setZ(newZ: number): void {
    if (this.paddleBody) {
      this.paddleBody.position.z = Math.max(-7.5, Math.min(7.5, newZ));
    }
  }

  getPlayerId(): string {
    return this.playerId; // Return UUID
  }

  get getPaddleBody(): BABYLON.Mesh | undefined {
    return this.paddleBody;
  }

  get getPaddleBodyPos(): BABYLON.Vector3 | undefined {
    return this.paddleBody?.position;
  }

  get getWinnerState(): boolean | undefined {
    return this.isWinner;
  }

  get getPlayerScore(): number {
    return this.playerScore;
  }

  get getPlayerRebounds(): number {
    return this.playerRebounds;
  }

  set playerWinner(winner: boolean) {
    this.isWinner = winner;
  }

  incrementPlayerRebounds(): void {
    this.playerRebounds += 1;
  }
}

export { playerPaddle }; 