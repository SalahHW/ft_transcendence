/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   homePage.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:50 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 16:14:51 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { buttonHTML } from "../components/button.js";
import Router from "../router/Router.js";
import { COMMON_CLASSES } from "../style/tailwindClasses.js";

export default class HomePage {
	private _container: HTMLElement;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<div class="${COMMON_CLASSES.pageContainer}">
				<div class="flex-grow flex items-center justify-center">
					<button id="play-button" class="${COMMON_CLASSES.primaryButton}">Play</button>
				</div>
				<div class="absolute bottom-8 left-8">
					 ${buttonHTML({
						id: "api-test-page-button",
						label: "API Test Page",
						type: "button",
						svgIcon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="text-white"><path fill="none" stroke="currentColor" stroke-width="2" d="M9 1v7L2 20v3h20v-3L15 8V1m0 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm-6 2a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm9-7c-7-3-6 4-12 1M6 1h12"/></svg>`
					 })}
				</div>
			</div>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const apiTestPageButton = document.getElementById("api-test-page-button") as HTMLButtonElement;
		apiTestPageButton.addEventListener("click", (event) => {
			event.preventDefault();
			Router.getInstance().navigate("/api-test");
		});
	}
}
