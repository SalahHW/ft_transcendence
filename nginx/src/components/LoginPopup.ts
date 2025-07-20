import AuthService from "../services/AuthNanoService.js";
import NotificationService from "../services/NotificationService.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
import ModalView from "./ModalView.js";
import { setButtonLoading } from "./PopUpUtils";

export default class LoginPopup extends ModalView {
	private _authService = AuthService.getInstance();

	constructor() {
		super({
			width: "100%",
			maxWidth: "36rem",
			contentContainerClasses: "p-8 mx-4",
		});
	}

	public show(): void {
		if (this._isVisible) return;
		this.render();
		super.show();
	}

	public render(): void {
		this._contentContainer.innerHTML = /* HTML */ `
			<h2 class="${UI_THEME.components.title} mb-6">Login with Credentials</h2>

			<form
				id="popup-container-form-login"
				class="${UI_THEME.components.form}"
			>
				<div>
					<input
						type="text"
						id="popup-container-username-login"
						placeholder="Username"
						class="${UI_THEME.components.input}"
						autocomplete="username"
					/>
				</div>

				<div>
					<input
						type="password"
						id="popup-container-password-login"
						placeholder="Password"
						class="${UI_THEME.components.input}"
						autocomplete="current-password"
					/>
				</div>

				<div class="flex justify-center mt-6">
					${buttonHTML({
						id: "popup-container-submit-login",
						type: "submit",
						label: "Login",
						style: UI_THEME.components.button.primary,
					})}
				</div>
			</form>
		`;

		this._attachFormEventListeners();
	}

	private _attachFormEventListeners(): void {
		const form = document.getElementById(
			"popup-container-form-login"
		) as HTMLFormElement;

		form?.addEventListener("submit", async (event) => {
			event.preventDefault();
			await this._handleSubmit();
		});
	}

	private async _handleSubmit(): Promise<void> {
		const usernameInput = document.getElementById(
			"popup-container-username-login"
		) as HTMLInputElement;
		const passwordInput = document.getElementById(
			"popup-container-password-login"
		) as HTMLInputElement;
		const submitBtn = document.getElementById(
			"popup-container-submit-login"
		) as HTMLButtonElement;

		if (!usernameInput.value || !passwordInput.value) {
			NotificationService.show("Please fill in all fields.", "error");
			return;
		}

		try {
			setButtonLoading(submitBtn, true, "Signing in...");

			await this._authService.login(
				usernameInput.value,
				passwordInput.value
			);

			NotificationService.show("Login successful!", "success");

			setTimeout(() => {
				this.hide();
			}, 1500);
		} catch (error) {
			console.log(error);
			NotificationService.show("Login failed. Please try again.", "error");
		} finally {
			setButtonLoading(submitBtn, false, "Login");
		}
	}
}

export { LoginPopup };
