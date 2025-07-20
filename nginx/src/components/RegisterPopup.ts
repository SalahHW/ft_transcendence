import AuthService from "../services/AuthNanoService.js";
import NotificationService from "../services/NotificationService.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
import { loadingSpinnerHTML } from "./loadingSpinner";
import ModalView from "./ModalView.js";

export default class RegisterPopup extends ModalView {
	private _authService = AuthService.getInstance();

	constructor() {
		super({
			width: "100%",
			maxWidth: "36rem",
			contentContainerClasses: "p-8 mx-4",
			authRequirement: 'loggedOut'
		});
	}

	public async show(): Promise<void> {
		if (this._isVisible) return;
		this.render();
		await super.show();
	}

	public render(): void {
		this._contentContainer.innerHTML = /* HTML */ `
			<h2 class="${UI_THEME.components.title} mb-6">Register with Credentials</h2>

			<form
				id="popup-container-form-register"
				class="${UI_THEME.components.form}"
			>
				<div>
					<input
						type="text"
						id="popup-container-username-register"
						placeholder="Username"
						class="${UI_THEME.components.input}"
					/>
				</div>

				<div>
					<input
						type="email"
						id="popup-container-email-register"
						placeholder="Email"
						class="${UI_THEME.components.input}"
					/>
				</div>

				<div>
					<input
						type="password"
						id="popup-container-password-register"
						placeholder="Password"
						class="${UI_THEME.components.input}"
					/>
				</div>

				<div>
					<input
						type="text"
						id="popup-container-wallet-register"
						placeholder="Wallet address"
						class="${UI_THEME.components.input}"
					/>
				</div>

				${loadingSpinnerHTML({ id: "popup-container-spinner-register" })}
				<div class="flex justify-center mt-6">
					${buttonHTML({
						id: "popup-container-submit-register",
						type: "submit",
						label: "Register",
						style: UI_THEME.components.button.primary,
					})}
				</div>
			</form>
		`;

		this._attachFormEventListeners();
	}

	private _attachFormEventListeners(): void {
		const form = document.getElementById(
			"popup-container-form-register"
		) as HTMLFormElement;
		form?.addEventListener("submit", async (event) => {
			event.preventDefault();
			await this._handleSubmit();
		});
	}

	private async _handleSubmit(): Promise<void> {
		const usernameInput = document.getElementById(
			"popup-container-username-register"
		) as HTMLInputElement;
		const emailInput = document.getElementById(
			"popup-container-email-register"
		) as HTMLInputElement;
		const passwordInput = document.getElementById(
			"popup-container-password-register"
		) as HTMLInputElement;
		const walletInput = document.getElementById(
			"popup-container-wallet-register"
		) as HTMLInputElement;

		const username = usernameInput.value.trim();
		const email = emailInput.value.trim();
		const password = passwordInput.value;
		const wallet = walletInput.value.trim();

		if (!username || !email || !password || !wallet) {
			NotificationService.show("Please fill in all fields.", "error");
			return;
		}

		this._setLoading(true);

		try {
			await this._authService.register({
				username,
				email,
				password,
				wallet,
			});

			NotificationService.show("Account created successfully!", "success");

			this.hide();
		} catch (error: any) {
			console.log(error);
			if (error?.response?.status === 409) {
				NotificationService.show("Username or email already exists.", "error");
			} else {
				// TODO: Add more specific error messages
				NotificationService.show("An error occurred during registration.", "error");
			}
		} finally {
			this._setLoading(false);
		}
	}

	private _setLoading(isLoading: boolean): void {
		const spinner = document.getElementById(
			"popup-container-spinner-register"
		);
		const submitButton = document.getElementById(
			"popup-container-submit-register"
		) as HTMLButtonElement;

		if (!spinner || !submitButton) return;

		if (isLoading) {
			spinner.classList.remove("hidden");
			submitButton.disabled = true;
			submitButton.classList.add("opacity-50", "cursor-not-allowed");
		} else {
			spinner.classList.add("hidden");
			submitButton.disabled = false;
			submitButton.classList.remove("opacity-50", "cursor-not-allowed");
		}
	}
}
