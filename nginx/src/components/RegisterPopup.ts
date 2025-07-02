/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RegisterPopup.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/16 16:30:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/23 16:03:37 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import AuthNanoService from "../auth/AuthNanoService.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";
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
      <!-- Titre -->
      <h2 class="${UI_THEME.components.title} mb-6">Register</h2>

      <!-- Formulaire -->
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

        <div style="display: none;">
          <input
            type="hidden"
            id="popup-container-authentication-method-register"
            value="credentials"
            name="authenticationMethod"
          />
        </div>

        <div>
          <input
            type="wallet"
            id="popup-container-wallet-register"
            placeholder="wallet"
            class="${UI_THEME.components.input}"
          />
        </div>

        <!-- Zone de message fixe pour éviter le resize -->
        <div id="popup-container-message-container-register" class="h-6 mt-4">
          <div
            id="popup-container-message-register"
            class="${UI_THEME.components
              .message} opacity-0 invisible transition-all duration-200"
          ></div>
        </div>

        ${buttonHTML({
          id: "popup-container-submit-register",
          type: "submit",
          label: "Create Account",
          style: UI_THEME.components.button.primary,
        })}
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
    const authenticationMethod = document.getElementById(
      "popup-container-authentication-method-register"
    ) as HTMLSelectElement;
    const wallet = document.getElementById(
      "popup-container-wallet-register"
    ) as HTMLInputElement;

    if (
      !usernameInput.value ||
      !emailInput.value ||
      !passwordInput.value ||
      !authenticationMethod.value ||
      !wallet.value
    ) {
      this._showError("Please fill in all fields.");
      return;
    }

    try {
      await this._authService.register(
        usernameInput.value,
        emailInput.value,
        passwordInput.value
      );

      // Fermer la popup après un délai
      setTimeout(() => {
        this.hide();
      }, 1500);
    } catch (error) {
      this._showError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création du compte"
      );
    }
  }

  private _showError(message: string): void {
    this._showMessage(message, "text-red-400");
  }

  private _showMessage(message: string, colorClass: string): void {
    const messageElement = document.getElementById(
      "popup-container-message-register"
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
