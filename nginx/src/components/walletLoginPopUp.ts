import ModalView from "./ModalView.js";
import AuthService from "../services/AuthNanoService.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
import { loadingSpinnerHTML } from "./loadingSpinner";
import NotificationService from "../services/NotificationService.js";

export default class WalletLoginPopup extends ModalView {
	private _authService: AuthService;

	constructor() {
		super({
			width: "100%",
			maxWidth: "28rem",
			contentContainerClasses: "p-6 mx-4",
			authRequirement: 'loggedOut'
		});
		this._authService = AuthService.getInstance();
	}

	public async show(): Promise<void> {
		if (this._isVisible) return;
		this.render();
		await super.show();
	}

	public render(): void {
		this._contentContainer.innerHTML = /* HTML */ `
			<h2 class="${UI_THEME.components.title} mb-4">Login with Wallet</h2>

			<form id="wallet-login-form" class="${UI_THEME.components.form}">
				${loadingSpinnerHTML({ id: "wallet-login-spinner" })}
				<div class="flex justify-center mt-6">
					${buttonHTML({
						id: "wallet-login-button",
						type: "submit",
						label: "Login",
						style: UI_THEME.components.button.primary,
					})}
				</div>
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById(
			"wallet-login-form"
		) as HTMLFormElement;

		form?.addEventListener("submit", async (event) => {
			event.preventDefault();
			await this._handleSubmit();
		});
	}

	private async _handleSubmit(): Promise<void> {
		this._setLoading(true);

		try {
			await this._authService.loginWithWallet();
			NotificationService.show("Logged in successfully!", "success");

			this.hide();
		} catch (error: any) {
			console.log(error);
			NotificationService.show("Wallet login failed", "error");
		} finally {
			this._setLoading(false);
		}
	}

	private _setLoading(isLoading: boolean): void {
		const spinner = document.getElementById("wallet-login-spinner");
		const button = document.getElementById(
			"wallet-login-button"
		) as HTMLButtonElement;

		if (!spinner || !button) return;

		if (isLoading) {
			spinner.classList.remove("hidden");
			button.disabled = true;
			button.classList.add("opacity-50", "cursor-not-allowed");
		} else {
			spinner.classList.add("hidden");
			button.disabled = false;
			button.classList.remove("opacity-50", "cursor-not-allowed");
		}
	}
}
