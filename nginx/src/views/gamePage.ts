export default class GamePage {
    private _container: HTMLElement;

    constructor(containerId: string) {
        this._container = document.getElementById(containerId) as HTMLElement;
        if (!this._container)
            throw new Error(`Container ${containerId} not found`);
    }

    async render(): Promise<void> {
        this._container.innerHTML = /* HTML */ `
            <div id="gameControls" class="absolute top-5 left-1/2 -translate-x-1/2 z-50 text-center">
                <button id="joinGameBtn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:bg-gray-400">Join Game</button>
                <div id="gameStatus" class="text-white mt-2"></div>
            </div>
            <canvas id="renderCanvas" class="w-full h-[90vh] block"></canvas>
        `;

        if (!document.getElementById('game-page-style')) {
            const style = document.createElement('style');
            style.id = 'game-page-style';
            style.textContent = `
                html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; }
                #renderCanvas { width:100%; height:100%; display:block; }
            `;
            document.head.appendChild(style);
        }

        try {
            // @ts-ignore: external module without declarations
            await import("../../../game-client/src/client/client.js");
        } catch (err) {
            console.error("Failed to load game client", err);
        }
    }
}