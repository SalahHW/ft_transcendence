/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ProfileView.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/22 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/01 16:12:34 by edelarbr         ###   ########.fr       */
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
			<div class="flex h-full w-full gap-4">
				<div class="flex flex-[3] flex-col gap-4">
					<div class="flex-1 rounded-2xl border border-red-500/30 p-4" id="profile"></div>
					<div class="flex-[2] rounded-2xl border border-red-500/30 p-4" id="match-history"></div>
				</div>
				<div class="flex-1">
					<div class="h-full rounded-2xl border border-red-500/30 p-4" id="friends"></div>
				</div>
			</div>
		`;
	}

	public async updateProfile(): Promise<void> {
		const profileContainer = this._contentContainer.querySelector('#profile');
		if (!profileContainer) {
			console.error('Profile container not found');
			return;
		}
	}
}
