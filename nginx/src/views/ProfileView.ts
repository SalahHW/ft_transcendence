/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ProfileView.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/22 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/21 16:29:24 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export default class ProfileView {
	private _element: HTMLElement;
	private _isVisible: boolean = false;

	constructor() {
		const container = document.createElement('div');
		container.id = "profile-view-container";
		document.body.appendChild(container);
		this._element = container;

		this.render();
		this._setupEventListeners();
	}

	private _setupEventListeners(): void {
		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Escape" && this._isVisible) {
				event.preventDefault();
				this.hide();
			}
		});

		this._element.addEventListener('click', (e) => {
			if (e.target === this._element) {
				this.hide();
			}
		});
	}

	public show(): void {
		if (this._isVisible) return;
		this._isVisible = true;

		this._element.classList.remove("hidden");
		this._element.classList.add("flex");

		requestAnimationFrame(() => {
			this._element.classList.add("opacity-100", "scale-100");
			this._element.classList.remove("opacity-0", "scale-95");
		});
	}

	public hide(): void {
		if (!this._isVisible) return;
		this._isVisible = false;

		this._element.classList.add("opacity-0", "scale-95");
		this._element.classList.remove("opacity-100", "scale-100");

		setTimeout(() => {
			this._element.classList.add("hidden");
			this._element.classList.remove("flex");
		}, 150);
	}

	public render(): void {
		this._element.className = `
			fixed inset-0 z-40 hidden items-center justify-center
			select-none opacity-0 scale-95 transition-all duration-150 ease-out
		`;

		this._element.innerHTML = /* HTML */`
			<div class="w-[90vw] h-[90vh] bg-[#313131]/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-[#5A5A5A]">
				<!-- Profile content will go here -->
			</div>
		`;
	}
}
