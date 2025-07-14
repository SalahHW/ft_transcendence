import MatchServiceAPI from "../../../services/api/match.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class GetTournamentByIdForm {
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
            <form id="get-tournament-by-id-form" class="${UI_THEME.components.form}">
                <div>
                    <input type="number" id="get-tournament-id" placeholder="Tournament ID" class="${UI_THEME.components.input}">
                </div>
                ${buttonHTML({
                    type: "submit",
                    label: "Get Tournament by ID"
                })}
            </form>
        `;
        this._attachEventListeners();
    }

    private _attachEventListeners(): void {
        const form = document.getElementById("get-tournament-by-id-form") as HTMLFormElement;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const idInput = document.getElementById("get-tournament-id") as HTMLInputElement;

            if (!idInput.value) {
                console.warn("Please provide a tournament ID");
                return;
            }

            try {
                const tournamentId = parseInt(idInput.value);
                const tournament = await this._matchService.getTournamentById(tournamentId);
                console.log(`Tournament found by ID:`, tournament);
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Error fetching tournament: ${error.message}`);
                }
                else {
                    console.error(`Error fetching tournament: ${error}`);
                }
            }
        });
    }
}
