import MatchServiceAPI from "../../../services/api/match.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class GetMatchesByPlayerForm {
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
            <form id="get-matches-by-player-form" class="${UI_THEME.components.form}">
                <div>
                    <input type="text" id="get-matches-player-address" placeholder="Player address (0x...)" class="${UI_THEME.components.input}">
                </div>
                ${buttonHTML({
                    type: "submit",
                    label: "Get Matches by Player"
                })}
            </form>
        `;
        this._attachEventListeners();
    }

    private _attachEventListeners(): void {
        const form = document.getElementById("get-matches-by-player-form") as HTMLFormElement;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const addressInput = document.getElementById("get-matches-player-address") as HTMLInputElement;

            if (!addressInput.value) {
                console.warn("Please provide a player address");
                return;
            }

            try {
                const matches = await this._matchService.getMatchesByPlayer(addressInput.value);
                console.log(`Matches found for player ${addressInput.value}:`, matches);
                 if (matches.length === 0) {
					console.log("No matches found for this player.");
				}
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Error fetching matches: ${error.message}`);
                }
                else {
                    console.error(`Error fetching matches: ${error}`);
                }
            }
        });
    }
}
