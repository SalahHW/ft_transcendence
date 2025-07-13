/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RegisterUserForm.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:38 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 18:08:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import AuthNanoService from "../../../services/AuthNanoService.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class RegisterUserForm {
	private _container: HTMLElement;
	private _authService: AuthNanoService;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._authService = AuthNanoService.getInstance();
	}

	async render(): Promise<void> {
		this._container.innerHTML = /* HTML */ `
			<form id="register-user-form" class="${UI_THEME.components.form}">
				<div>
					<input type="text" id="register-user-form-username" placeholder="Username (required)" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="email" id="register-user-form-email" placeholder="Email (required)" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="text" id="register-user-form-wallet" placeholder="Wallet (required)" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="password" id="register-user-form-password" placeholder="Password (required)" class="${UI_THEME.components.input}">
				</div>

				${buttonHTML({
					id: "register-user-form-register",
					type: "submit",
					label: "Register"
				})}
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("register-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const usernameInput = document.getElementById("register-user-form-username") as HTMLInputElement;
			const passwordInput = document.getElementById("register-user-form-password") as HTMLInputElement;
			const emailInput = document.getElementById("register-user-form-email") as HTMLInputElement;
			const walletInput = document.getElementById("register-user-form-wallet") as HTMLInputElement;

			if (!usernameInput.value || !passwordInput.value || !emailInput.value || !walletInput.value) {
				console.warn("Please provide username, email, password and wallet");
				return;
			}

			try {
				const response = await this._authService.register({
					username: usernameInput.value,
					password: passwordInput.value,
					email: emailInput.value,
					wallet: walletInput.value
				});
				console.log(response);
			}
			catch (error) {
				if (error instanceof Error)
					console.error(error.message);
				else
					console.error(error);
			}
		});
	}
}
