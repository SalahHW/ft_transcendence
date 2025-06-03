/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RegisterUserForm.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:38 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/03 15:35:38 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import UsersApi from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { COMMON_CLASSES } from "../../../style/tailwindClasses.js";

export default class RegisterUserForm {
	private _container: HTMLElement;
	private _userService: UsersApi;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UsersApi();
	}

	async render(): Promise<void> {
		this._container.innerHTML = /* HTML */ `
			<form id="register-user-form" class="${COMMON_CLASSES.form}">
				<div>
					<label class="${COMMON_CLASSES.label}">Username (required)</label>
					<input type="text" id="register-user-form-username" class="${COMMON_CLASSES.input}">
				</div>

				<div>
					<label class="${COMMON_CLASSES.label}">Email (required)</label>
					<input type="email" id="register-user-form-email" class="${COMMON_CLASSES.input}">
				</div>

				<div>
					<label class="${COMMON_CLASSES.label}">Password (required)</label>
					<input type="password" id="register-user-form-password" class="${COMMON_CLASSES.input}">
				</div>

				<div>
					<label class="${COMMON_CLASSES.label}">Wallet Address (required)</label>
					<input type="text" id="register-user-form-wallet" class="${COMMON_CLASSES.input}" placeholder="0x...">
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
				console.warn("Please provide username, email, password and wallet address");
				return;
			}

			try {
				const response = await this._userService.register(
					usernameInput.value,
					passwordInput.value,
					emailInput.value,
					walletInput.value
				);
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
