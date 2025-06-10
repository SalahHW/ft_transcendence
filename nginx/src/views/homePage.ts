/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   homePage.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:50 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/31 16:38:50 by edelarbr         ###   ########.fr       */
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
					<div id="play-button-container" class="relative">
						<!-- Bouton principal Play -->
						<div id="play-button-main" class="transition-all duration-300 ease-in-out">
							${buttonHTML({
								id: "play-button",
								label: "Play",
								type: "button",
								style: "primary",
							})}
						</div>

						<!-- Conteneur des boutons splittes (masqué par défaut) -->
						<div id="play-buttons-split" class="absolute top-0 left-1/2 transform -translate-x-1/2 opacity-0 pointer-events-none transition-all duration-300 ease-in-out scale-95">
							<div class="flex gap-4 justify-center">
							${buttonHTML({
								id: "play-solo-button",
								label: "Solo",
								type: "button",
								style: "primary",
							})}
							${buttonHTML({
								id: "play-multi-button",
								label: "Multiplayer",
								type: "button",
								style: "primary",
							})}
							</div>
						</div>
					</div>
				</div>
				<div class="absolute bottom-8 left-8">
					${buttonHTML({
						id: "api-test-page-button",
						label: "API Test Page",
						type: "button",
						svgIcon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="text-white"><path fill="none" stroke="currentColor" stroke-width="2" d="M9 1v7L2 20v3h20v-3L15 8V1m0 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm-6 2a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm9-7c-7-3-6 4-12 1M6 1h12"/></svg>`,
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

		// Gestion du split du bouton Play
		const playButtonContainer = document.getElementById("play-button-container") as HTMLElement;
		const playButtonMain = document.getElementById("play-button-main") as HTMLElement;
		const playButtonsSplit = document.getElementById("play-buttons-split") as HTMLElement;
		const playSoloButton = document.getElementById("play-solo-button") as HTMLButtonElement;
		const playMultiButton = document.getElementById("play-multi-button") as HTMLButtonElement;

		// Événements pour le survol
		playButtonContainer.addEventListener("mouseenter", () => {
			// Masquer le bouton principal
			playButtonMain.style.opacity = "0";
			playButtonMain.style.transform = "scale(0.8)";
			playButtonMain.style.pointerEvents = "none";

			// Afficher les boutons splittes
			setTimeout(() => {
				playButtonsSplit.style.opacity = "1";
				playButtonsSplit.style.transform = "scale(1)";
				playButtonsSplit.style.pointerEvents = "auto";
			}, 150);
		});

		playButtonContainer.addEventListener("mouseleave", () => {
			// Masquer les boutons splittes
			playButtonsSplit.style.opacity = "0";
			playButtonsSplit.style.transform = "scale(0.95)";
			playButtonsSplit.style.pointerEvents = "none";

			// Réafficher le bouton principal
			setTimeout(() => {
				playButtonMain.style.opacity = "1";
				playButtonMain.style.transform = "scale(1)";
				playButtonMain.style.pointerEvents = "auto";
			}, 150);
		});

		// Événements de clic pour les nouveaux boutons
		playSoloButton.addEventListener("click", (event) => {
			event.preventDefault();
			// Naviguer vers le mode solo ou déclencher l'action appropriée
			console.log("Solo mode selected");
			// Router.getInstance().navigate("/game/solo");
		});

		playMultiButton.addEventListener("click", (event) => {
			event.preventDefault();
			// Naviguer vers le mode multijoueur ou déclencher l'action appropriée
			console.log("Multiplayer mode selected");
			// Router.getInstance().navigate("/game/multiplayer");
		});
	}
}
