import Router from "../../../router/Router.js";

export default class SecondPlacePage {
    private container: HTMLElement;
    private countdownTimer: number | null = null;
    private isDisrupted: boolean;

    constructor(containerId: string, isDisrupted: boolean = false) {
        this.container = document.getElementById(containerId) as HTMLElement;
        if (!this.container) {
            throw new Error(`Container ${containerId} not found`);
        }
        this.isDisrupted = isDisrupted;
    }

    render(): void {
        const backgroundClass = this.isDisrupted 
            ? 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800' 
            : 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600';
            
        const message = this.isDisrupted
            ? '🏆 Tournament completed (some players disconnected)'
            : '🏆 Tournament complete! You finished 2nd place! 🥈';
            
        const subtitle = this.isDisrupted
            ? 'You finished 2nd place'
            : 'Great performance!';
        
        this.container.innerHTML = /* HTML */ `
            <div class="fixed inset-0 ${backgroundClass} flex items-center justify-center z-50">
                <div class="text-center text-white animate-pulse">
                    <!-- Second Place Icon -->
                    <div class="mb-8">
                        <div class="text-8xl mb-4">🥈</div>
                        <div class="text-6xl font-bold text-gray-300 mb-2">SECOND PLACE!</div>
                        <div class="text-3xl text-gray-200 mb-4">🏆 TOURNAMENT RUNNER-UP 🏆</div>
                        <div class="text-2xl text-gray-100">${subtitle}</div>
                    </div>
                    
                    <!-- Disruption Notice -->
                    ${this.isDisrupted ? `
                    <div class="mt-4 mb-6">
                        <div class="text-lg text-gray-300 bg-gray-800 bg-opacity-50 px-4 py-2 rounded-lg">
                            ⚠️ Some players disconnected during the tournament
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-200">
                            Returning to main menu in <span id="countdown" class="text-white font-bold">5</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Celebration Animation -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="confetti">🏆</div>
                        <div class="confetti" style="animation-delay: 0.5s;">🥈</div>
                        <div class="confetti" style="animation-delay: 1s;">✨</div>
                        <div class="confetti" style="animation-delay: 1.5s;">🎊</div>
                        <div class="confetti" style="animation-delay: 2s;">⭐</div>
                        <div class="confetti" style="animation-delay: 0.3s;">👑</div>
                        <div class="confetti" style="animation-delay: 0.8s;">💎</div>
                        <div class="confetti" style="animation-delay: 1.3s;">🔥</div>
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
                .confetti:nth-child(2) { left: 25%; animation-duration: 3s; }
                .confetti:nth-child(3) { left: 40%; animation-duration: 2.8s; }
                .confetti:nth-child(4) { left: 55%; animation-duration: 3.2s; }
                .confetti:nth-child(5) { left: 70%; animation-duration: 2.7s; }
                .confetti:nth-child(6) { left: 85%; animation-duration: 3.1s; }
                .confetti:nth-child(7) { left: 95%; animation-duration: 2.9s; }
                .confetti:nth-child(8) { left: 5%; animation-duration: 3.3s; }
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