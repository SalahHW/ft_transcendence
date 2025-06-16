/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RegisterPopup.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/16 16:30:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/16 18:40:08 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import UsersApi from "../api/user.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import { buttonHTML } from "./button.js";

export default class RegisterPopup {
	private _element: HTMLElement;
	private _userService: UsersApi;
	private _isVisible: boolean = false;

	constructor(elementId: string) {
		this._element = document.getElementById(elementId)!;
		if (!this._element) {
			throw new Error(`Element with id ${elementId} not found`);
		}
		this._userService = new UsersApi();
		this._setupEventListeners();
	}

	private _setupEventListeners(): void {
		// Fermer la popup si on clique sur le backdrop
		this._element.addEventListener("click", (event: MouseEvent) => {
			if (event.target === this._element) {
				this.hide();
			}
		});

		// Fermer avec Escape
		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Escape" && this._isVisible) {
				event.preventDefault();
				this.hide();
			}
		});
	}

	public show(): void {
		if (this._isVisible) return;

		this._isVisible = true;
		this.render();

		this._element.classList.remove("hidden");
		this._element.classList.add("flex");

		// Animation d'entrée
		requestAnimationFrame(() => {
			this._element.classList.add("opacity-100", "scale-100");
			this._element.classList.remove("opacity-0", "scale-95");
		});
	}

	public hide(): void {
		if (!this._isVisible) return;

		this._isVisible = false;

		// Animation de sortie avec requestAnimationFrame pour la cohérence
		requestAnimationFrame(() => {
			this._element.classList.add("opacity-0", "scale-95");
			this._element.classList.remove("opacity-100", "scale-100");

			// Attendre la fin de l'animation CSS avant de masquer
			setTimeout(() => {
				this._element.classList.add("hidden");
				this._element.classList.remove("flex");
			}, 150);
		});
	}

	public render(): void {
		this._element.className = UI_THEME.components.overlay;

		this._element.innerHTML = /* HTML */ `
			<div class="${UI_THEME.components.popupContainer} p-8 max-w-md w-full mx-4">

				<!-- Titre -->
				<h2 class="${UI_THEME.components.title} mb-6">
					Register
				</h2>

				<!-- Formulaire -->
				<form id="popup-container-form" class="${UI_THEME.components.form}">
					<div>
						<input
							type="text"
							id="popup-container-username"
							placeholder="Username"
							class="${UI_THEME.components.input}"
						>
					</div>

					<div>
						<input
							type="email"
							id="popup-container-email"
							placeholder="Email"
							class="${UI_THEME.components.input}"
						>
					</div>

					<div>
						<input
							type="password"
							id="popup-container-password"
							placeholder="Password"
							class="${UI_THEME.components.input}"
						>
					</div>

					<!-- Zone de message fixe pour éviter le resize -->
					<div id="popup-container-message-container" class="h-6 mt-4">
						<div id="popup-container-message" class="${UI_THEME.components.message} opacity-0 invisible transition-all duration-200"></div>
					</div>

					${buttonHTML({
						id: "popup-container-submit",
						type: "submit",
						label: "Create Account",
						style: UI_THEME.components.button.primary,
					})}
				</form>
			</div>
		`;

		this._attachFormEventListeners();
	}

	private _attachFormEventListeners(): void {
		const form = document.getElementById("popup-container-form") as HTMLFormElement;

		form?.addEventListener("submit", async (event) => {
			event.preventDefault();
			await this._handleSubmit();
		});
	}

	private async _handleSubmit(): Promise<void> {
		const usernameInput = document.getElementById("popup-container-username") as HTMLInputElement;
		const emailInput = document.getElementById("popup-container-email") as HTMLInputElement;
		const passwordInput = document.getElementById("popup-container-password") as HTMLInputElement;

		if (!usernameInput.value || !emailInput.value || !passwordInput.value) {
			this._showError("Please fill in all fields.");
			return;
		}

		try {
			await this._userService.register(
				usernameInput.value,
				passwordInput.value,
				emailInput.value
			);

			// Fermer la popup après un délai
			setTimeout(() => {
				this.hide();
			}, 1500);

		}
		catch (error) {
			this._showError(error instanceof Error ? error.message : "Erreur lors de la création du compte");
		}
	}

	private _showError(message: string): void {
		this._showMessage(message, "text-red-400");
	}

	private _showMessage(message: string, colorClass: string): void {
		const messageElement = document.getElementById("popup-container-message");
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

