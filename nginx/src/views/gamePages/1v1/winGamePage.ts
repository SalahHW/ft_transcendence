/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   winGamePage.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 00:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/01/27 00:00:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Router from "../../../router/Router.js";

export default class WinGamePage {
    private container: HTMLElement;
    private opponentName: string;
    private score: string;
    private countdownTimer: number | null = null;

    constructor(containerId: string, opponentName: string = "Unknown Player", score: string = "") {
        this.container = document.getElementById(containerId) as HTMLElement;
        if (!this.container) {
            throw new Error(`Container ${containerId} not found`);
        }
        this.opponentName = opponentName;
        this.score = score;
    }

    render(): void {
        this.container.innerHTML = /* HTML */ `
            <div class="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
                <div class="text-center text-white animate-pulse">
                    <!-- Victory Icon -->
                    <div class="mb-8">
                        <div class="text-8xl mb-4">🏆</div>
                        <div class="text-6xl font-bold text-yellow-400 mb-2">VICTORY!</div>
                        <div class="text-2xl text-green-400">You won this versus against ${this.opponentName}!</div>
                        ${this.score ? `<div class="text-xl text-gray-300 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Returning to main menu in <span id="countdown" class="text-white font-bold">4</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Celebration Animation -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="confetti">🎉</div>
                        <div class="confetti" style="animation-delay: 0.5s;">✨</div>
                        <div class="confetti" style="animation-delay: 1s;">🎊</div>
                        <div class="confetti" style="animation-delay: 1.5s;">⭐</div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
                
                .confetti {
                    position: absolute;
                    font-size: 2rem;
                    animation: confetti-fall 3s infinite linear;
                    left: calc(20% + var(--random-x, 0) * 60%);
                    top: -10%;
                }
                
                .confetti:nth-child(1) { left: 10%; animation-duration: 2.5s; }
                .confetti:nth-child(2) { left: 30%; animation-duration: 3s; }
                .confetti:nth-child(3) { left: 50%; animation-duration: 2.8s; }
                .confetti:nth-child(4) { left: 70%; animation-duration: 3.2s; }
                .confetti:nth-child(5) { left: 90%; animation-duration: 2.7s; }
            </style>
        `;

        this.startCountdown();
    }

    private startCountdown(): void {
        let countdown = 4;
        const countdownElement = document.getElementById('countdown');
        
        this.countdownTimer = window.setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown.toString();
            }
            
            if (countdown <= 0) {
                this.navigateToHome();
            }
        }, 1000);
    }

    private navigateToHome(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        Router.getInstance().navigate('/');
    }

    cleanup(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }
}
