import * as BABYLON from '@babylonjs/core';
import { playerPaddle as paddle } from './player';

interface KeyState {
    w: boolean;
    s: boolean;
    o: boolean;
    l: boolean;
}

let keyState: KeyState = {
    w: false,
    s: false,
    o: false,
    l: false,
};

const keystrokesListen = (player1: paddle, player2: paddle): void => {
    window.addEventListener("keydown", (event: KeyboardEvent) => {
        switch (event.key) {
            case "w": keyState.w = true; break;
            case "s": keyState.s = true; break;
            case "o": keyState.o = true; break;
            case "l": keyState.l = true; break;
        }
    });

    window.addEventListener("keyup", (event: KeyboardEvent) => {
        switch (event.key) {
            case "w": keyState.w = false; break;
            case "s": keyState.s = false; break;
            case "o": keyState.o = false; break;
            case "l": keyState.l = false; break;
        }
    });
    
}

const keystrokesCatch = (keyState: KeyState, player1: paddle, player2: paddle): void => {
    if (!player1.paddleBody || !player2.paddleBody || !player1.paddleSpeed || !player2.paddleSpeed) return;
    
    if (keyState.w) player1.paddleBody.position.z -= player2.paddleSpeed;
    if (keyState.s) player1.paddleBody.position.z += player2.paddleSpeed;

    if (keyState.l) player2.paddleBody.position.z += player1.paddleSpeed;
    if (keyState.o) player2.paddleBody.position.z -= player1.paddleSpeed;

    const minZ = -7.5;
    const maxZ = 7.5;
    player2.paddleBody.position.z = Math.max(minZ, Math.min(maxZ, player2.paddleBody.position.z));
    player1.paddleBody.position.z = Math.max(minZ, Math.min(maxZ, player1.paddleBody.position.z));
}

export {keystrokesListen, keyState, keystrokesCatch}; 