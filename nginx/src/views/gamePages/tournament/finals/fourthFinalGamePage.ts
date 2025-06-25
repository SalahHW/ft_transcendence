import Router from "../../../../router/Router.js";

export default class FourthFinalGamePage {
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
                    <!-- Fourth Place Icon -->
                    <div class="mb-8">
                        <div class="text-8xl mb-4">🏅</div>
                        <div class="text-6xl font-bold text-purple-400 mb-2">GREAT EFFORT!</div>
                        <div class="text-3xl text-purple-500">🏅 4th PLACE 🏅</div>
                        <div class="text-2xl text-red-400 mt-2">You lost to ${this.opponentName}</div>
                        ${this.score ? `<div class="text-xl text-gray-400 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Achievement Message -->
                    <div class="mb-6 p-6 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg border-2 border-purple-400">
                        <div class="text-3xl text-purple-300 font-bold mb-2">🏅 4th PLACE FINISH 🏅</div>
                        <div class="text-xl text-white">You weren't quite up to the task to win</div>
                        <div class="text-2xl text-purple-200 font-bold">But you made it to the finals!</div>
                        <div class="text-lg text-blue-300 mt-2">Keep practicing for next time!</div>
                    </div>
                    
                    <!-- Encouraging Message -->
                    <div class="mb-6">
                        <div class="text-lg text-blue-400">Room for improvement!</div>
                        <div class="text-md text-gray-400">You competed well but came up short</div>
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Returning to main page in <span id="countdown" class="text-white font-bold">5</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Gentle Celebration Animation -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="sparkle-gentle" style="left: 20%; top: 25%; animation-delay: 0.5s;">✨</div>
                        <div class="sparkle-gentle" style="left: 80%; top: 35%; animation-delay: 1.0s;">⭐</div>
                        <div class="sparkle-gentle" style="left: 30%; top: 65%; animation-delay: 1.5s;">💫</div>
                        <div class="sparkle-gentle" style="left: 70%; top: 75%; animation-delay: 2.0s;">🌟</div>
                        <div class="sparkle-gentle" style="left: 50%; top: 20%; animation-delay: 2.5s;">✨</div>
                        <div class="sparkle-gentle" style="left: 15%; top: 80%; animation-delay: 3.0s;">⭐</div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes sparkle-gentle-twinkle {
                    0%, 100% {
                        opacity: 0.4;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.3);
                    }
                }
                
                @keyframes glow-purple {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(147, 51, 234, 0.8);
                    }
                }
                
                .sparkle-gentle {
                    position: absolute;
                    font-size: 1.8rem;
                    animation: sparkle-gentle-twinkle 3s infinite ease-in-out;
                }
                
                .bg-gradient-to-r {
                    animation: glow-purple 2s infinite ease-in-out;
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
                this.navigateToMainPage();
            }
        }, 1000);
    }

    private navigateToMainPage(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        // Navigate to main page
        Router.getInstance().navigate('/');
    }

    cleanup(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }
}
