import Router from "../../../router/Router.js";

export default class LoseGamePage {
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
                        <div class="text-8xl mb-4">💔</div>
                        <div class="text-6xl font-bold text-red-400 mb-2">DEFEAT</div>
                        <div class="text-2xl text-gray-300">You lost this versus against ${this.opponentName}!</div>
                        ${this.score ? `<div class="text-xl text-gray-400 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Encouraging Message -->
                    <div class="mb-6">
                        <div class="text-lg text-blue-400">Better luck next time, champion!</div>
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Returning to main menu in <span id="countdown" class="text-white font-bold">4</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Rain Animation -->
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
                
                .rain-drop {
                    position: absolute;
                    width: 2px;
                    height: 20px;
                    background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.6));
                    animation: rain-fall 1.5s infinite linear;
                    top: -10%;
                }
                
                .rain-drop:nth-child(odd) {
                    animation-duration: 1.2s;
                }
                
                .rain-drop:nth-child(even) {
                    animation-duration: 1.8s;
                }
            </style>
        `;

        this.startCountdown();
    }

    private startCountdown(): void {
        let countdown = 5;
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
