/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   homePage.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:50 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/21 15:50:35 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export default class HomePage {
	private _container: HTMLElement;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<div class="relative w-full h-screen bg-black">
				<!-- Game Screenshot Background -->
				<svg class="w-full h-full opacity-70 blur-xs" viewBox="0 0 1400 700" xmlns="http://www.w3.org/2000/svg">
					<!-- Black background -->
					<rect width="1400" height="700" fill="#000000"/>

					<!-- Gray game court -->
					<rect x="140" y="120" width="1120" height="460" fill="#bbbbbb"/>

					<!-- Left paddle (blue) - centered vertically -->
					<rect x="90" y="265" width="50" height="170" fill="#00aaff"/>

					<!-- Right paddle (red) - centered vertically -->
					<rect x="1260" y="265" width="50" height="170" fill="#ff061e"/>

					<!-- White ball -->
					<circle cx="700" cy="350" r="15" fill="#ffffff"/>
				</svg>

				<!-- Blinking text overlay -->
				<div class="absolute inset-0 flex items-center justify-center">
					<div class="flex items-center space-x-2 animate-pulse">
						<span class="text-black text-4xl font-sans font-medium">Hold shift</span>
						<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M27.5622 39.8122H12.2497C11.4374 39.8122 10.6585 39.4895 10.0842 38.9152C9.50983 38.3409 9.18717 37.5619 9.18717 36.7497V21.4372H1.53092C1.22812 21.4371 0.932131 21.3473 0.680378 21.179C0.428625 21.0107 0.232412 20.7716 0.116542 20.4919C0.000672144 20.2121 -0.0296512 19.9043 0.0294053 19.6073C0.0884619 19.3103 0.234247 19.0375 0.44833 18.8233L18.8233 0.448329C19.1105 0.161264 19.4999 0 19.9059 0C20.312 0 20.7014 0.161264 20.9885 0.448329L39.3635 18.8233C39.5776 19.0375 39.7234 19.3103 39.7824 19.6073C39.8415 19.9043 39.8112 20.2121 39.6953 20.4919C39.5794 20.7716 39.3832 21.0107 39.1315 21.179C38.8797 21.3473 38.5837 21.4371 38.2809 21.4372H30.6247V36.7497C30.6235 37.5615 30.3004 38.3398 29.7263 38.9138C29.1523 39.4879 28.374 39.811 27.5622 39.8122ZM5.22736 18.3747H12.2497V36.7497H27.5622V18.3747H34.5845L19.9059 3.69611L5.22736 18.3747Z" fill="black"/>
						</svg>
					</div>
				</div>
			</div>
		`;
	}
}
