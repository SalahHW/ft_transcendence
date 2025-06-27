import Router from "../../../../router/Router.js";

export default class ThirdFinalGamePage {
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
                    <!-- Third Place Icon -->
                    <div class="mb-8">
                        <div class="text-8xl mb-4">🥉</div>
                        <div class="text-6xl font-bold text-orange-400 mb-2">PODIUM FINISH!</div>
                        <div class="text-3xl text-orange-500">🏆 3rd PLACE 🏆</div>
                        <div class="text-2xl text-green-400 mt-2">You defeated ${this.opponentName}!</div>
                        ${this.score ? `<div class="text-xl text-gray-300 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Achievement Message -->
                    <div class="mb-6 p-6 bg-gradient-to-r from-orange-600 to-amber-700 rounded-lg border-2 border-orange-400">
                        <div class="text-3xl text-orange-300 font-bold mb-2">🥉 PODIUM CHAMPION! 🥉</div>
                        <div class="text-xl text-white">You achieved 3rd place in the tournament!</div>
                        <div class="text-2xl text-orange-200 font-bold">Third place finish!</div>
                        <div class="text-lg text-yellow-300 mt-2">Excellent tournament showing!</div>
                    </div>
                    
                    <!-- Encouraging Message -->
                    <div class="mb-6">
                        <div class="text-lg text-blue-400">Well done!</div>
                        <div class="text-md text-gray-400">You earned the third place in the tournament!</div>
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Returning to main page in <span id="countdown" class="text-white font-bold">5</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Bronze Celebration Animation -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="confetti-bronze">🥉</div>
                        <div class="confetti-bronze" style="animation-delay: 0.3s;">🏆</div>
                        <div class="confetti-bronze" style="animation-delay: 0.6s;">⭐</div>
                        <div class="confetti-bronze" style="animation-delay: 0.9s;">🎉</div>
                        <div class="confetti-bronze" style="animation-delay: 1.2s;">✨</div>
                        <div class="confetti-bronze" style="animation-delay: 1.5s;">💫</div>
                        <div class="confetti-bronze" style="animation-delay: 1.8s;">🥉</div>
                        <div class="confetti-bronze" style="animation-delay: 2.1s;">🎊</div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes confetti-fall-bronze {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(450deg);
                        opacity: 0;
                    }
                }
                
                @keyframes glow-bronze {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(205, 127, 50, 0.6);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(205, 127, 50, 0.9);
                    }
                }
                
                .confetti-bronze {
                    position: absolute;
                    font-size: 2rem;
                    animation: confetti-fall-bronze 3.5s infinite linear;
                    left: calc(10% + var(--random-x, 0) * 80%);
                    top: -10%;
                }
                
                .confetti-bronze:nth-child(1) { left: 15%; animation-duration: 3.2s; }
                .confetti-bronze:nth-child(2) { left: 30%; animation-duration: 3.7s; }
                .confetti-bronze:nth-child(3) { left: 45%; animation-duration: 3.4s; }
                .confetti-bronze:nth-child(4) { left: 60%; animation-duration: 3.9s; }
                .confetti-bronze:nth-child(5) { left: 75%; animation-duration: 3.3s; }
                .confetti-bronze:nth-child(6) { left: 90%; animation-duration: 3.8s; }
                .confetti-bronze:nth-child(7) { left: 10%; animation-duration: 3.6s; }
                .confetti-bronze:nth-child(8) { left: 85%; animation-duration: 3.5s; }
                
                .bg-gradient-to-r {
                    animation: glow-bronze 2s infinite ease-in-out;
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
