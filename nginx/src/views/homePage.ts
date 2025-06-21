/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   homePage.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:50 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/21 14:44:10 by edelarbr         ###   ########.fr       */
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
		`;
	}
}
