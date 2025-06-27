/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GetUserForm.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 21:08:25 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 16:14:51 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import UsersApi from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class GetUserForm {
	private _container: HTMLElement;
	private _userService: UsersApi;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UsersApi();
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="get-user-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="getform-user-id" placeholder="ID (optional)" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="text" id="getform-user-name" placeholder="Name (optional)" class="${UI_THEME.components.input}">
				</div>

				${buttonHTML({label: "Get User", type: "submit"})}
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const idInput = document.getElementById("getform-user-id") as HTMLInputElement;
			const nameInput = document.getElementById("getform-user-name") as HTMLInputElement;

			if (idInput.value && nameInput.value) {
				console.warn("Please provide only one field to get user (id or name)");
				return;
			}
			if (!idInput.value && !nameInput.value) {
				console.warn("Please provide one field to get user (id or name)");
				return;
			}

			try {
				if (idInput.value) {
					const userId = parseInt(idInput.value);
					const response = await this._userService.getUserById(userId);
					form.reset();
					console.log(`User found by id:\n${JSON.stringify(response, null, 2)}`);
				}
				else if (nameInput.value) {
					const response = await this._userService.getUsersByUsername(nameInput.value);
					form.reset();
					console.log(`User found by name:\n${JSON.stringify(response, null, 2)}`);
				}
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
