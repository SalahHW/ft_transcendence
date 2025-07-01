import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
import ModalView from "./ModalView.js";

export default class WalletConnectRegisterPopup extends ModalView {
	constructor() {
		super({
			width: '100%',
			maxWidth: '32rem',
			contentContainerClasses: 'p-8 mx-4'
		});
	}

	public show(): void {
		if (this._isVisible) return;
		this.render();
		super.show();
	}

	public render(): void {
		this._contentContainer.innerHTML = /* HTML */ `
			<h2 class="${UI_THEME.components.title} mb-6">
				Register with WalletConnect
			</h2>
			<form id="popup-container-form-wallet-register" class="${UI_THEME.components.form}">
				<div>
					<input
						type="text"
						id="popup-container-username-wallet-register"
						placeholder="Username"
						class="${UI_THEME.components.input}"
					>
				</div>
				<div id="popup-container-message-container-wallet-register" class="h-6 mt-4">
					<div id="popup-container-message-wallet-register" class="${UI_THEME.components.message} opacity-0 invisible transition-all duration-200"></div>
				</div>
				${buttonHTML({
					id: "popup-container-walletconnect-btn",
					type: "button",
					label: "Connect Wallet",
					style: UI_THEME.components.button.primary,
				})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const btn = document.getElementById("popup-container-walletconnect-btn");
		btn?.addEventListener("click", async () => {
			const usernameInput = document.getElementById("popup-container-username-wallet-register") as HTMLInputElement;
			if (!usernameInput.value) {
				this._showError("Please enter a username.");
				return;
			}
			// Ici, intégrer la logique WalletConnect (bonne pratique : séparer la logique d'intégration)
			this._showMessage("WalletConnect integration not implemented.", "text-yellow-400");
		});
	}

	private _showError(message: string): void {
		this._showMessage(message, "text-red-400");
	}

	private _showMessage(message: string, colorClass: string): void {
		const messageElement = document.getElementById("popup-container-message-wallet-register");
		if (!messageElement) return;
		messageElement.className = `${UI_THEME.components.message} ${colorClass} opacity-100 visible transition-all duration-200`;
		messageElement.textContent = message;
		setTimeout(() => {
			messageElement.classList.remove("opacity-100", "visible");
			messageElement.classList.add("opacity-0", "invisible");
			setTimeout(() => {
				messageElement.textContent = "";
			}, 200);
		}, 3000);
	}
}
