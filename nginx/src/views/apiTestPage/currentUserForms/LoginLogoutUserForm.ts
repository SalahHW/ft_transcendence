/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LoginLogoutUserForm.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:34 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 16:14:51 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import UsersApi from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class LoginLogoutUserForm {
	private _container: HTMLElement;
	private _userService: UsersApi;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UsersApi();
	}

	async render(): Promise<void> {
		try {
			const response = await this._userService.getCurrentUser();
			if (response)
				this._renderLogoutForm();
			else
				this._renderLoginForm();
		}
		catch (error) {
			if (error instanceof Error)
				console.error(error.message);
			else
				console.error(error);
		}
	}

	private _renderLoginForm(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="login-logout-user-form" class="${UI_THEME.components.form}">
				<div>
					<input type="text" id="login-logout-user-form-username" placeholder="Username (required)" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="password" id="login-logout-user-form-password" placeholder="Password (required)" class="${UI_THEME.components.input}">
				</div>

				${buttonHTML({
					id: "login-logout-user-form-login",
					type: "submit",
					label: "Login"
				})}
			</form>
		`;

		this._attachLoginEventListeners();
	}

	private _attachLoginEventListeners(): void {
		const form = document.getElementById("login-logout-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const usernameInput = document.getElementById("login-logout-user-form-username") as HTMLInputElement;
			const passwordInput = document.getElementById("login-logout-user-form-password") as HTMLInputElement;
			if (!usernameInput.value || !passwordInput.value) {
				console.warn("Please provide both username and password");
				return;
			}

			try {
				const response = await this._userService.login(usernameInput.value, passwordInput.value);
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

	private _renderLogoutForm(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="login-logout-user-form" class="${UI_THEME.components.form}">
				${buttonHTML({
					id: "login-logout-user-form-logout",
					type: "submit",
					label: "Logout"
				})}
			</form>
		`;

		this._attachLogoutEventListeners();
	}

	private _attachLogoutEventListeners(): void {
		const form = document.getElementById("login-logout-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			// await this._userService.logout();
		});
	}

}
