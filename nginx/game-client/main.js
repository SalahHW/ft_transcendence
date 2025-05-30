// import * as BABYLON from '@babylonjs/core';
import { playerPaddle } from './src/player/player.js';
import { gameMap} from './src/map/gameMap.js';
import { Ball } from './src/ball/ball.js';
import { keystrokesListen, keyState, keystrokesCatch } from './src/player/playerUtils.js';

export default function launchGame() {
    const nPlayer = 2;
    let map = new gameMap();
    let player1, player2;
    let playBall = new Ball();

    if (nPlayer === 2) {
        player1 = new playerPaddle('test1', 0);
        player2 = new playerPaddle('test2', 1);
    }


    map.createMap();
    //map.createSkyBox(map.getScene);
    map.createPlayground();
    player1.createPaddle(map.getScene, 19.5, 2, 0.7);
    player2.createPaddle(map.getScene, -19.5, 2, 0.7);
    map.launchMatchAnimation().then(() => {
        playBall.createBall(map.getScene);
        keystrokesListen(player1, player2);
        map.getScene.onBeforeRenderObservable.add(() => {
            map.gameStateHandler(player1, player2);
            keystrokesCatch(keyState, player1, player2);
            playBall.ballMovement(player1, player2, map.getScene);
        })
    });
    map.getEngine.runRenderLoop(() => map.getScene.render());
    window.addEventListener('resize', () => map.getEngine.resize());
}
