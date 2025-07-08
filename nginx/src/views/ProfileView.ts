/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ProfileView.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/22 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/08 21:36:32 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import ModalView from "../components/ModalView.js";
import { mockProfile } from "../api/mockProfile/mockProfile.js";
import { UI_THEME } from "../style/tailwindClasses.js";

export default class ProfileView extends ModalView {

	constructor() {
		super({
			width: '70vw',
			height: '70vh'
		});

		this.render();
	}

	public render(): void {
		this._contentContainer.innerHTML = /* HTML */`
			<div class="flex h-full w-full overflow-auto min-h-0">
				<div class="relative flex flex-[4] flex-col gap-2 p-2 after:absolute after:right-0 after:top-[5%] after:h-[90%] after:w-px after:bg-white/20">
					<div class="relative flex-[1] rounded-2xl p-4 after:absolute after:bottom-0 after:left-[5%] after:h-px after:w-[90%] after:bg-white/20" id="profile"></div>
					<div class="flex-[3] rounded-2xl min-h-0" id="match-history"></div>
				</div>
				<div class="flex-[2]">
					<div class="h-full rounded-2xl p-4 overflow-y-auto" id="friends"></div>
				</div>
			</div>
		`;
		this.updateProfile();
		this.updateMatchHistory();
		this.updateFriendList();
	}

	public updateProfile(): void {
		console.log('Updating profile...');
		const profileContainer = this._contentContainer.querySelector('#profile');
		if (!profileContainer) {
			console.error('Profile container not found');
			return;
		};
		profileContainer.innerHTML = /* HTML */`
			<div class="flex gap-2 h-full">
				<div class="flex-[1] rounded-lg p-4 aspect-square">
					<img src="${mockProfile.avatar.url}" alt="Profile Picture" class="w-full h-full object-cover text-white rounded-lg">
				</div>
				<div class="flex-[2] rounded-lg p-4 flex flex-col justify-start items-start">
					<h2 class="text-4xl font-bold text-white">${mockProfile.user.username}</h2>
					<p class="text-gray-500">${mockProfile.user.email}</p>
				</div>
				<div class="flex-[1] rounded-lg p-4">
					${this.createWinRateDonutChart({
						wins: mockProfile.matches.totalwins,
						losses: mockProfile.matches.totallosses
					})}
				</div>
			</div>
		`;
	}

	public updateMatchHistory(): void {
		const matchHistoryContainer = this._contentContainer.querySelector('#match-history');
		if (!matchHistoryContainer) {
			console.error('Match history container not found');
			return;
		}
		const matchesHtml = mockProfile.matches.matches.map(match => this.createMatchHistoryItem(match)).join('');
		matchHistoryContainer.innerHTML = /* HTML */`
			<div class="flex flex-col h-full">
				<div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
					${matchesHtml}
				</div>
			</div>
		`;
	}

	public updateFriendList(): void {
		const friendListContainer = this._contentContainer.querySelector('#friends');
		if (!friendListContainer) {
			console.error('Friend list container not found');
			return;
		}
		const friendsHtml = mockProfile.friends.map(friend => this.createFriendListItem(friend)).join('');
		friendListContainer.innerHTML = /* HTML */`
			<div class="flex flex-col gap-2 h-full">
				<div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
					${friendsHtml}
				</div>
			</div>
		`;
	}

	private createWinRateDonutChart(stats: { wins: number, losses: number }, showText: boolean = true): string {
		const total = stats.wins + stats.losses;

		// Si aucun match joué, afficher un donut gris
		if (total === 0) {
			return /* HTML */`
				<div class="relative w-full h-full">
					<svg class="w-full h-full" viewBox="0 0 100 100">
						<circle
							cx="50"
							cy="50"
							r="35"
							fill="none"
							stroke="#666666"
							stroke-width="14"
							stroke-linecap="round"
						/>
					</svg>
					${showText ? `
						<div class="absolute inset-0 flex flex-col items-center justify-center text-white">
							<span class="font-bold text-xl">0 W</span>
							<span class="text-gray-400">0 L</span>
						</div>
					` : ''}
				</div>
			`;
		}

		// Gap de 40 degrés entre les segments pour bien les séparer
		const gapAngle = 40;

		// Calcul des pourcentages
		const winPercentage = stats.wins / total;
		const lossPercentage = stats.losses / total;

		// Espace disponible après avoir retiré les gaps
		const availableAngle = 360 - gapAngle;

		// Calcul des angles réels pour chaque segment
		const winAngle = winPercentage * availableAngle;
		const lossAngle = lossPercentage * availableAngle;

		// Fonction pour convertir angle en coordonnées polaires
		const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
			const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
			return {
				x: centerX + (radius * Math.cos(angleInRadians)),
				y: centerY + (radius * Math.sin(angleInRadians))
			};
		};

		// Fonction pour créer un arc SVG
		const createArcPath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
			const start = polarToCartesian(centerX, centerY, radius, endAngle);
			const end = polarToCartesian(centerX, centerY, radius, startAngle);
			const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

			return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
		};

		const centerX = 50;
		const centerY = 50;
		const radius = 35;

		// Segment vert (wins) - commence à 10° après midi pour laisser un gap et va dans le sens horaire
		const winStartAngle = 10; // Gap réduit depuis le haut
		const winEndAngle = winStartAngle + winAngle;
		const winPath = createArcPath(centerX, centerY, radius, winStartAngle, winEndAngle);

		// Segment rouge (losses) - commence à -10° avant midi et va dans le sens antihoraire
		const lossEndAngle = 350; // Gap réduit avant le haut
		const lossStartAngle = lossEndAngle - lossAngle;
		const lossPath = createArcPath(centerX, centerY, radius, lossStartAngle, lossEndAngle);

		return /* HTML */`
			<div class="relative w-full h-full">
				<svg class="w-full h-full" viewBox="0 0 100 100">
					<!-- Segment vert (victoires) -->
					${winAngle > 0 ? `
						<path
							d="${winPath}"
							fill="none"
							stroke="${UI_THEME.colors.green.light}"
							stroke-width="10"
							stroke-linecap="round"
						/>
					` : ''}

					<!-- Segment rouge (défaites) -->
					${lossAngle > 0 ? `
						<path
							d="${lossPath}"
							fill="none"
							stroke="${UI_THEME.colors.red.light}"
							stroke-width="10"
							stroke-linecap="round"
						/>
					` : ''}
				</svg>
				${showText ? `
					<div class="absolute inset-0 flex flex-col items-center justify-center text-white">
						<span class="font-bold text-xl">${stats.wins} W</span>
						<span class="text-gray-400">${stats.losses} L</span>
					</div>
				` : ''}
			</div>
		`;
	}

    private createMatchHistoryItem(match: any): string {
        const userWon = match.score.user > match.score.opponent;
        const resultText = userWon ? 'VICTORY' : 'DEFEAT';
        const resultColor = userWon ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;
        const userAvatar = mockProfile.avatar.url || '/assets/defaultAvatar.jpg';
        const opponentAvatar = match.opponent.avatarUrl || '/assets/defaultAvatar.jpg';
        const bgColor = userWon ? UI_THEME.colors.green.dark : UI_THEME.colors.red.dark;


        return /* HTML */`
            <div class="flex items-center justify-between p-4 rounded-lg mb-2" style="background-color: ${bgColor}80;">
                <div class="flex items-center w-1/3">
                    <div>
                        <img src="${userAvatar}" alt="${mockProfile.user.username} avatar" class="text-white w-16 h-16 rounded-lg object-cover">
                    </div>
                    <div class="ml-4">
                        <span class="text-white">${mockProfile.user.username}</span>
                    </div>
                </div>
                <div class="font-bold text-lg text-center w-1/3 flex flex-col justify-center items-center">
                    <span class="font-bold text-2xl" style="color: ${resultColor}">${resultText}</span>
                    <div>
                        <span class="w-8 text-right text-white">${match.score.user}</span>
                        <span class="mx-2 text-white">-</span>
                        <span class="w-8 text-left text-white">${match.score.opponent}</span>
                    </div>
                </div>
                <div class="flex items-center justify-end w-1/3">
                    <div class="mr-4">
                        <span class="text-white">${match.opponent.username}</span>
                    </div>
                    <div>
                        <img src="${opponentAvatar}" alt="${match.opponent.username} avatar" class=" text-white w-16 h-16 rounded-lg object-cover">
                    </div>
                </div>
            </div>
        `;
    }

	private createFriendListItem(friend: any): string {
		const statusColor = friend.status === 'online' ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;
		return /* HTML */`
			<div class="flex items-center justify-between p-2 rounded-lg mb-2 bg-black/20">
				<div class="flex items-center gap-3">
					<div class="relative">
						<img src="${friend.avatarUrl}" alt="${friend.username} avatar" class="text-white w-12 h-12 rounded-lg object-cover">
						<span class="absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-gray-800" style="background-color: ${statusColor}"></span>
					</div>
					<span class="text-white font-medium">${friend.username}</span>
				</div>
				<div class="w-12 h-12">
					${this.createWinRateDonutChart({ wins: friend.wins, losses: friend.losses }, false)}
				</div>
			</div>
		`;
	}
}
