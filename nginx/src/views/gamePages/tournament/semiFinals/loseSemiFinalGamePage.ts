import Router from "../../../../router/Router.js";

export default class LoseSemiFinalGamePage {
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
                <div class="text-center text-white">
                    <!-- Defeat Icon -->
                    <div class="mb-8">
                        <div class="text-8xl mb-4">🥉</div>
                        <div class="text-6xl font-bold text-orange-400 mb-2">SEMI-FINAL DEFEAT</div>
                        <div class="text-2xl text-gray-300">You lost to ${this.opponentName}</div>
                        ${this.score ? `<div class="text-xl text-gray-400 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Consolation Message -->
                    <div class="mb-6 p-6 bg-gradient-to-r from-orange-800 to-red-800 rounded-lg border-2 border-orange-400">
                        <div class="text-3xl text-orange-400 font-bold mb-2">📋 CONSOLATION FINAL</div>
                        <div class="text-xl text-white">You will now compete for</div>
                        <div class="text-2xl text-orange-300 font-bold">3rd or 4th Place</div>
                        <div class="text-lg text-yellow-300 mt-2">Still a chance for the podium!</div>
                    </div>
                    
                    <!-- Encouraging Message -->
                    <div class="mb-6">
                        <div class="text-lg text-blue-400">Fight for your place on the podium!</div>
                        <div class="text-md text-gray-400">Every position matters in the tournament</div>
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Preparing for consolation final in <span id="countdown" class="text-white font-bold">5</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Rain Animation with some hope -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="rain-drop" style="left: 10%; animation-delay: 0s;"></div>
                        <div class="rain-drop" style="left: 20%; animation-delay: 0.2s;"></div>
                        <div class="rain-drop" style="left: 30%; animation-delay: 0.4s;"></div>
                        <div class="rain-drop" style="left: 40%; animation-delay: 0.1s;"></div>
                        <div class="rain-drop" style="left: 50%; animation-delay: 0.6s;"></div>
                        <div class="rain-drop" style="left: 60%; animation-delay: 0.3s;"></div>
                        <div class="rain-drop" style="left: 70%; animation-delay: 0.8s;"></div>
                        <div class="rain-drop" style="left: 80%; animation-delay: 0.5s;"></div>
                        <div class="rain-drop" style="left: 90%; animation-delay: 0.7s;"></div>
                        
                        <!-- Some sparkles for hope -->
                        <div class="sparkle" style="left: 15%; top: 20%; animation-delay: 1s;">✨</div>
                        <div class="sparkle" style="left: 75%; top: 30%; animation-delay: 2s;">⭐</div>
                        <div class="sparkle" style="left: 45%; top: 60%; animation-delay: 3s;">💫</div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes rain-fall {
                    0% {
                        transform: translateY(-100vh);
                        opacity: 0.7;
                    }
                    100% {
                        transform: translateY(100vh);
                        opacity: 0;
                    }
                }
                
                @keyframes sparkle-twinkle {
                    0%, 100% {
                        opacity: 0.3;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                }
                
                @keyframes glow-orange {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(255, 165, 0, 0.8);
                    }
                }
                
                .rain-drop {
                    position: absolute;
                    width: 2px;
                    height: 20px;
                    background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.4));
                    animation: rain-fall 1.5s infinite linear;
                    top: -10%;
                }
                
                .rain-drop:nth-child(odd) {
                    animation-duration: 1.2s;
                }
                
                .rain-drop:nth-child(even) {
                    animation-duration: 1.8s;
                }
                
                .sparkle {
                    position: absolute;
                    font-size: 1.5rem;
                    animation: sparkle-twinkle 2s infinite ease-in-out;
                }
                
                .bg-gradient-to-r {
                    animation: glow-orange 2s infinite ease-in-out;
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
