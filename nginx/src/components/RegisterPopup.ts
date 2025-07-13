/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RegisterPopup.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/16 16:30:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 18:08:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import AuthNanoService from "../services/AuthNanoService.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
import { loadingSpinnerHTML } from "./loadingSpinner";
import ModalView from "./ModalView.js";

export default class RegisterPopup extends ModalView {
  private _authService: AuthNanoService;

  constructor() {
    super({
      width: "100%",
      maxWidth: "36rem",
      contentContainerClasses: "p-8 mx-4",
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
      <h2 class="${UI_THEME.components.title} mb-6">Register</h2>

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

        <div id="popup-container-message-container-register" class="h-6 mt-4">
          <div
            id="popup-container-message-register"
            class="${UI_THEME.components
              .message} opacity-0 invisible transition-all duration-200"
          ></div>
        </div>

        ${loadingSpinnerHTML({ id: "popup-container-spinner-register" })}
        <div class="flex justify-center mt-6">
          ${buttonHTML({
            id: "popup-container-submit-register",
            type: "submit",
            label: "Create Account",
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
      this._showError("Please fill in all fields.");
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

      this._showSuccess("Account created successfully!");

      setTimeout(() => {
        this.hide();
      }, 1500);
    } catch (error: any) {
      if (error?.response?.status === 409) {
        this._showError("Username or email already exists.");
      } else {
        this._showError(
          error instanceof Error
            ? error.message
            : "An error occurred during registration."
        );
      }
    } finally {
      this._setLoading(false);
    }
  }

  private _setLoading(isLoading: boolean): void {
    const spinner = document.getElementById("popup-container-spinner-register");
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

  private _showError(message: string): void {
    this._showMessage(message, "text-red-400");
  }

  private _showSuccess(message: string): void {
    this._showMessage(message, "text-green-400");
  }

  private _showMessage(message: string, colorClass: string): void {
    const messageElement = document.getElementById(
      "popup-container-message-register"
    );
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
