/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ProfileView.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/22 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/21 16:55:06 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import ModalView from "../components/ModalView.js";

export default class ProfileView extends ModalView {

	constructor() {
		super({
			width: '90vw',
			height: '90vh'
		});

		this.render();
	}

	public render(): void {
		this._contentContainer.innerHTML = /* HTML */`
			<!-- Profile content will go here -->
		`;
	}
}
