import Router from "../../../../router/Router.js";

export default class FirstFinalGamePage {
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
                    <!-- Champion Icon -->
                    <div class="mb-8">
                        <div class="text-9xl mb-4">👑</div>
                        <div class="text-7xl font-bold text-yellow-400 mb-2">CHAMPION!</div>
                        <div class="text-3xl text-gold-400">🏆 1st PLACE 🏆</div>
                        <div class="text-2xl text-green-400 mt-2">You defeated ${this.opponentName}!</div>
                        ${this.score ? `<div class="text-xl text-gray-300 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Victory Message -->
                    <div class="mb-6 p-6 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-lg border-2 border-yellow-400">
                        <div class="text-4xl text-yellow-300 font-bold mb-2">🥇 TOURNAMENT CHAMPION! 🥇</div>
                        <div class="text-xl text-white">You have achieved 1st place!</div>
                        <div class="text-2xl text-yellow-300 font-bold">You won the tournament!</div>
                        <div class="text-lg text-amber-300 mt-2">Congratulations on your ultimate victory!</div>
                    </div>
                    
                    <!-- Encouraging Message -->
                    <div class="mb-6">
                        <div class="text-lg text-blue-400">Outstanding performance!</div>
                        <div class="text-md text-gray-400">You are the tournament champion - the very best!</div>
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Returning to main page in <span id="countdown" class="text-white font-bold">5</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Celebration Animation -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="confetti-gold">🏆</div>
                        <div class="confetti-gold" style="animation-delay: 0.3s;">👑</div>
                        <div class="confetti-gold" style="animation-delay: 0.6s;">🥇</div>
                        <div class="confetti-gold" style="animation-delay: 0.9s;">⭐</div>
                        <div class="confetti-gold" style="animation-delay: 1.2s;">🎉</div>
                        <div class="confetti-gold" style="animation-delay: 1.5s;">✨</div>
                        <div class="confetti-gold" style="animation-delay: 1.8s;">🏆</div>
                        <div class="confetti-gold" style="animation-delay: 2.1s;">👑</div>
                        <div class="confetti-gold" style="animation-delay: 2.4s;">💫</div>
                        <div class="confetti-gold" style="animation-delay: 2.7s;">🎊</div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes confetti-fall-gold {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                @keyframes glow-gold {
                    0%, 100% {
                        box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
                    }
                    50% {
                        box-shadow: 0 0 50px rgba(255, 215, 0, 1);
                    }
                }
                
                .confetti-gold {
                    position: absolute;
                    font-size: 2.5rem;
                    animation: confetti-fall-gold 4s infinite linear;
                    left: calc(5% + var(--random-x, 0) * 90%);
                    top: -10%;
                }
                
                .confetti-gold:nth-child(1) { left: 5%; animation-duration: 3.5s; }
                .confetti-gold:nth-child(2) { left: 15%; animation-duration: 4s; }
                .confetti-gold:nth-child(3) { left: 25%; animation-duration: 3.8s; }
                .confetti-gold:nth-child(4) { left: 35%; animation-duration: 4.2s; }
                .confetti-gold:nth-child(5) { left: 45%; animation-duration: 3.7s; }
                .confetti-gold:nth-child(6) { left: 55%; animation-duration: 4.1s; }
                .confetti-gold:nth-child(7) { left: 65%; animation-duration: 3.9s; }
                .confetti-gold:nth-child(8) { left: 75%; animation-duration: 4.3s; }
                .confetti-gold:nth-child(9) { left: 85%; animation-duration: 3.6s; }
                .confetti-gold:nth-child(10) { left: 95%; animation-duration: 4.4s; }
                
                .bg-gradient-to-r {
                    animation: glow-gold 2s infinite ease-in-out;
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
