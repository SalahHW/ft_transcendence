/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LoginPopup.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/16 18:20:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 18:08:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import AuthNanoService from "../services/AuthNanoService.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
import ModalView from "./ModalView.js";
import { setButtonLoading } from "./PopUpUtils";

export default class LoginPopup extends ModalView {
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
      <!-- Titre -->
      <h2 class="${UI_THEME.components.title} mb-6">Sign In</h2>

      <!-- Formulaire -->
      <form id="popup-container-form-login" class="${UI_THEME.components.form}">
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

        <!-- Zone de message fixe pour éviter le resize -->
        <div id="popup-container-message-container-login" class="h-6 mt-4">
          <div
            id="popup-container-message-login"
            class="${UI_THEME.components
              .message} opacity-0 invisible transition-all duration-200"
          ></div>
        </div>

        <div class="flex justify-center mt-6">
          ${buttonHTML({
            id: "popup-container-submit-login",
            type: "submit",
            label: "Sign In",
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
      this._showError("Please fill in all fields.");
      return;
    }

    try {
      setButtonLoading(submitBtn, true, "Signing in...");

      await this._authService.login(usernameInput.value, passwordInput.value);

      this._showSuccess("Login successful!");

      setTimeout(() => {
        this.hide();
      }, 1500);
    } catch (error) {
      this._showError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setButtonLoading(submitBtn, false, "Sign In");
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
      "popup-container-message-login"
    );
    if (!messageElement) return;

    // Réinitialiser les classes et afficher le message
    messageElement.className = `${UI_THEME.components.message} ${colorClass} opacity-100 visible transition-all duration-200`;
    messageElement.textContent = message;

    // Masquer automatiquement après 3 secondes
    setTimeout(() => {
      messageElement.classList.remove("opacity-100", "visible");
      messageElement.classList.add("opacity-0", "invisible");

      // Nettoyer le contenu après l'animation
      setTimeout(() => {
        messageElement.textContent = "";
      }, 200);
    }, 3000);
  }
}

export { LoginPopup };
