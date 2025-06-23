import Router from "../../../../router/Router.js";

export default class WinSemiFinalGamePage {
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
                        <div class="text-6xl font-bold text-yellow-400 mb-2">SEMI-FINAL VICTORY!</div>
                        <div class="text-2xl text-green-400">You defeated ${this.opponentName}!</div>
                        ${this.score ? `<div class="text-xl text-gray-300 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Advancement Message -->
                    <div class="mb-6 p-6 bg-gradient-to-r from-purple-800 to-blue-800 rounded-lg border-2 border-yellow-400">
                        <div class="text-3xl text-yellow-400 font-bold mb-2">🎯 ADVANCING TO FINALS!</div>
                        <div class="text-xl text-white">You will now compete for</div>
                        <div class="text-2xl text-yellow-300 font-bold">1st or 2nd Place</div>
                        <div class="text-lg text-blue-300 mt-2">Championship Final Match!</div>
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Preparing for finals in <span id="countdown" class="text-white font-bold">5</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Celebration Animation -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="confetti">🎉</div>
                        <div class="confetti" style="animation-delay: 0.5s;">✨</div>
                        <div class="confetti" style="animation-delay: 1s;">🎊</div>
                        <div class="confetti" style="animation-delay: 1.5s;">⭐</div>
                        <div class="confetti" style="animation-delay: 2s;">🏆</div>
                        <div class="confetti" style="animation-delay: 2.5s;">💫</div>
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
                
                @keyframes glow {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
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
                .confetti:nth-child(2) { left: 20%; animation-duration: 3s; }
                .confetti:nth-child(3) { left: 40%; animation-duration: 2.8s; }
                .confetti:nth-child(4) { left: 60%; animation-duration: 3.2s; }
                .confetti:nth-child(5) { left: 80%; animation-duration: 2.7s; }
                .confetti:nth-child(6) { left: 90%; animation-duration: 3.1s; }
                
                .bg-gradient-to-r {
                    animation: glow 2s infinite ease-in-out;
                }
            </style>
        `;

        this.startCountdown();
    }

    private startCountdown(): void {
        let countdown = 6;
        const countdownElement = document.getElementById('countdown');
        
        this.countdownTimer = window.setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown.toString();
            }
            
            if (countdown <= 0) {
                this.navigateToNextStage();
            }
        }, 1000);
    }

    private navigateToNextStage(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        // Don't navigate - let the parent overlay system handle removal
        // This will be handled by the tournament client system
    }

    cleanup(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }
}
