import MatchServiceAPI from "../../../services/api/match.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class GetPlayerNameByAddressForm {
    private _container: HTMLElement;
    private _matchService: MatchServiceAPI;

    constructor(containerId: string) {
        this._container = document.getElementById(containerId) as HTMLElement;
        this._matchService = new MatchServiceAPI();
        if (!this._container)
            throw new Error(`Container ${containerId} not found`);
    }

    render(): void {
        this._container.innerHTML = /* HTML */ `
            <form id="get-player-name-form" class="${UI_THEME.components.form}">
                <div>
                    <input type="text" id="get-player-name-address" placeholder="Player address (0x...)" class="${UI_THEME.components.input}">
                </div>
                ${buttonHTML({
                    type: "submit",
                    label: "Get Player Name"
                })}
            </form>
        `;
        this._attachEventListeners();
    }

    private _attachEventListeners(): void {
        const form = document.getElementById("get-player-name-form") as HTMLFormElement;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const addressInput = document.getElementById("get-player-name-address") as HTMLInputElement;

            if (!addressInput.value) {
                console.warn("Please provide a player address");
                return;
            }

            try {
                const playerName = await this._matchService.getPlayerNameByAddress(addressInput.value);
                console.log(`Player name for ${addressInput.value}: ${playerName}`);
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Error fetching player name: ${error.message}`);
                }
                else {
                    console.error(`Error fetching player name: ${error}`);
                }
            }
        });
    }
}
