import MatchServiceAPI from "../../../services/api/match.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class ReportTournamentForm {
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
            <form id="report-tournament-form" class="${UI_THEME.components.form}">
                <div>
                    <input type="number" id="report-tournament-timestamp" placeholder="End Timestamp (e.g., 1620000000)" class="${UI_THEME.components.input}">
                </div>
                <div>
                    <input type="text" id="report-tournament-match-ids" placeholder="Match IDs (comma-separated, e.g., 1,2,3,4)" class="${UI_THEME.components.input}">
                </div>
                <div>
                    <input type="text" id="report-tournament-winner" placeholder="Winner address (0x...)" class="${UI_THEME.components.input}">
                </div>
                <div>
                    <input type="text" id="report-tournament-token-ids" placeholder="Tournament Token IDs (comma-separated)" class="${UI_THEME.components.input}">
                </div>
                ${buttonHTML({
                    type: "submit",
                    label: "Report Tournament"
                })}
            </form>
        `;
        this._attachEventListeners();
    }

    private _attachEventListeners(): void {
        const form = document.getElementById("report-tournament-form") as HTMLFormElement;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const timestampInput = document.getElementById("report-tournament-timestamp") as HTMLInputElement;
            const matchIdsInput = document.getElementById("report-tournament-match-ids") as HTMLInputElement;
            const winnerInput = document.getElementById("report-tournament-winner") as HTMLInputElement;
            const tokenIdsInput = document.getElementById("report-tournament-token-ids") as HTMLInputElement;

            if (!timestampInput.value || !matchIdsInput.value || !winnerInput.value || !tokenIdsInput.value) {
                console.warn("Please provide all fields for the tournament report.");
                return;
            }

            const tournamentData = {
                endTimestamp: parseInt(timestampInput.value),
                matchIds: matchIdsInput.value.split(',').map(id => parseInt(id.trim())),
                winner: winnerInput.value,
                tournamentTokenIds: tokenIdsInput.value.split(',').map(id => parseInt(id.trim()))
            };

            try {
                const txHash = await this._matchService.reportTournament(tournamentData);
                console.log(`Tournament reported! Tx hash: ${txHash}`);
                form.reset();
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Failed to report tournament:`, error.message);
                }
                else {
                    console.error(`Failed to report tournament:`, error);
                }
            }
        });
    }
}
