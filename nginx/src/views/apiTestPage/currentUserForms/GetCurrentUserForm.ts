/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GetCurrentUserForm.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:30 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/26 20:42:32 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import UsersApi from "../../../api/user.js";

export default class GetMeUserForm {
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
			<form id="get-me-user-form" class="space-y-4">
				<button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
					Get Me
				</button>
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-me-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			try {
				const response = await this._userService.getCurrentUser();
				console.log(`Current user:\n${JSON.stringify(response, null, 2)}`);
			}
			catch (error) {
				if (error instanceof Error)
					console.log(error.message);
				else
					console.log(error);
			}
		});
	}
}
