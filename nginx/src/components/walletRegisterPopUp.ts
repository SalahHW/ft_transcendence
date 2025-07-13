import ModalView from "./ModalView.js";
import AuthNanoService from "../services/AuthNanoService.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
import { loadingSpinnerHTML } from "./loadingSpinner";

export default class WalletRegisterPopup extends ModalView {
  private _authService: AuthNanoService;

  constructor() {
    super({
      width: "100%",
      maxWidth: "28rem",
      contentContainerClasses: "p-6 mx-4",
    });
    this._authService = AuthNanoService.getInstance();
  }

  public show(): void {
    if (this._isVisible) return;
    this.render();
    super.show();
  }

  public render(): void {
    this._contentContainer.innerHTML = /* HTML */ `
      <h2 class="${UI_THEME.components.title} mb-4">Register with Wallet</h2>

      <form id="wallet-register-form" class="${UI_THEME.components.form}">
        <div>
          <input
            type="text"
            id="wallet-register-username"
            placeholder="Username"
            class="${UI_THEME.components.input}"
          />
        </div>

        <div id="wallet-register-message-container" class="h-6 mb-4">
          <div
            id="wallet-register-message"
            class="${UI_THEME.components
              .message} opacity-0 invisible transition-all duration-200"
          ></div>
        </div>

        ${loadingSpinnerHTML({ id: "wallet-register-spinner" })}
        <div class="flex justify-center mt-6">
          ${buttonHTML({
            id: "wallet-register-button",
            type: "submit",
            label: "Register with MetaMask",
            style: UI_THEME.components.button.primary,
          })}
        </div>
      </form>
    `;

    this._attachEventListeners();
  }

  private _attachEventListeners(): void {
    const form = document.getElementById(
      "wallet-register-form"
    ) as HTMLFormElement;

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this._handleSubmit();
    });
  }

  private async _handleSubmit(): Promise<void> {
    const usernameInput = document.getElementById(
      "wallet-register-username"
    ) as HTMLInputElement;

    const username = usernameInput.value.trim();
    if (!username) {
      this._showError("Username is required.");
      return;
    }

    this._setLoading(true);

    try {
      await this._authService.registerWithWallet(username);
      this._showSuccess(`Welcome, ${username}!`);

      setTimeout(() => {
        this.hide();
      }, 1500);
    } catch (error: any) {
      this._showError(
        error instanceof Error ? error.message : "Wallet registration failed"
      );
    } finally {
      this._setLoading(false);
    }
  }

  private _setLoading(isLoading: boolean): void {
    const spinner = document.getElementById("wallet-register-spinner");
    const button = document.getElementById(
      "wallet-register-button"
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

  private _showError(message: string): void {
    this._showMessage(message, "text-red-400");
  }

  private _showSuccess(message: string): void {
    this._showMessage(message, "text-green-400");
  }

  private _showMessage(message: string, colorClass: string): void {
    const el = document.getElementById("wallet-register-message");
    if (!el) return;

    el.className = `${UI_THEME.components.message} ${colorClass} opacity-100 visible transition-all duration-200`;
    el.textContent = message;

    setTimeout(() => {
      el.classList.remove("opacity-100", "visible");
      el.classList.add("opacity-0", "invisible");

      setTimeout(() => {
        el.textContent = "";
      }, 200);
    }, 3000);
  }
}
