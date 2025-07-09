/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   WinRateDonutChart.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/08 22:31:56 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { UI_THEME } from "../../../style/tailwindClasses.js";

export function createWinRateDonutChart(stats: { wins: number, losses: number }, showText: boolean = true): string {
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
