import MatchServiceAPI from "../../../services/api/match.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class GetTournamentsByWinnerForm {
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
            <form id="get-tournaments-by-winner-form" class="${UI_THEME.components.form}">
                <div>
                    <input type="text" id="get-tournaments-winner-address" placeholder="Winner address (0x...)" class="${UI_THEME.components.input}">
                </div>
                ${buttonHTML({
                    type: "submit",
                    label: "Get Tournaments by Winner"
                })}
            </form>
        `;
        this._attachEventListeners();
    }

    private _attachEventListeners(): void {
        const form = document.getElementById("get-tournaments-by-winner-form") as HTMLFormElement;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const addressInput = document.getElementById("get-tournaments-winner-address") as HTMLInputElement;

            if (!addressInput.value) {
                console.warn("Please provide a winner address");
                return;
            }

            try {
                const tournaments = await this._matchService.getTournamentsByWinner(addressInput.value);
                console.log(`Tournaments found for winner ${addressInput.value}:`, tournaments);
                if (tournaments.length === 0) {
					console.log("No tournaments found for this winner.");
				}
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Error fetching tournaments: ${error.message}`);
                }
                else {
                    console.error(`Error fetching tournaments: ${error}`);
                }
            }
        });
    }
}
