import { UI_THEME } from "../../../style/tailwindClasses.js";

export function createWinRateDonutChart(stats: { wins: number, losses: number }, showText: boolean = true): string {
    const total = stats.wins + stats.losses;

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

    const gapAngle = 40;
    const availableAngle = 360 - gapAngle;

    const winPercentage = stats.wins / total;
    const lossPercentage = stats.losses / total;

    const winAngle = winPercentage * availableAngle;
    const lossAngle = lossPercentage * availableAngle;

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const createArcPath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(centerX, centerY, radius, endAngle);
        const end = polarToCartesian(centerX, centerY, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    const centerX = 50;
    const centerY = 50;
    const radius = 35;

    const winStartAngle = 10;
    const winEndAngle = winStartAngle + winAngle;
    const winPath = createArcPath(centerX, centerY, radius, winStartAngle, winEndAngle);

    const lossEndAngle = 350;
    const lossStartAngle = lossEndAngle - lossAngle;
    const lossPath = createArcPath(centerX, centerY, radius, lossStartAngle, lossEndAngle);

    return /* HTML */`
        <div class="relative w-full h-full">
            <svg class="w-full h-full" viewBox="0 0 100 100">
                ${winAngle > 0 ? `
                    <path
                        d="${winPath}"
                        fill="none"
                        stroke="${UI_THEME.colors.green.light}"
                        stroke-width="10"
                        stroke-linecap="round"
                    />
                ` : ''}

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
