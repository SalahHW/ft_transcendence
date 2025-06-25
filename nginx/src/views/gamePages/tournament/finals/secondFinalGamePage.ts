import Router from "../../../../router/Router.js";

export default class SecondFinalGamePage {
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
                    <!-- Second Place Icon -->
                    <div class="mb-8">
                        <div class="text-8xl mb-4">🥈</div>
                        <div class="text-6xl font-bold text-gray-300 mb-2">RUNNER-UP!</div>
                        <div class="text-3xl text-gray-400">🏆 2nd PLACE 🏆</div>
                        <div class="text-2xl text-orange-400 mt-2">You lost to ${this.opponentName}</div>
                        ${this.score ? `<div class="text-xl text-gray-400 mt-2">Final Score: ${this.score}</div>` : ''}
                    </div>
                    
                    <!-- Achievement Message -->
                    <div class="mb-6 p-6 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg border-2 border-gray-400">
                        <div class="text-3xl text-gray-300 font-bold mb-2">🥈 EXCELLENT PERFORMANCE! 🥈</div>
                        <div class="text-xl text-white">You achieved 2nd place in the tournament!</div>
                        <div class="text-2xl text-gray-300 font-bold">Outstanding runner-up finish!</div>
                        <div class="text-lg text-gray-400 mt-2">So close to the championship!</div>
                    </div>
                    
                    <!-- Encouraging Message -->
                    <div class="mb-6">
                        <div class="text-lg text-blue-400">Outstanding effort!</div>
                        <div class="text-md text-gray-400">You earned your place as tournament runner-up!</div>
                    </div>
                    
                    <!-- Countdown -->
                    <div class="mt-8">
                        <div class="text-lg text-gray-400">
                            Returning to main page in <span id="countdown" class="text-white font-bold">5</span> seconds...
                        </div>
                    </div>
                    
                    <!-- Silver Celebration Animation -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div class="confetti-silver">🥈</div>
                        <div class="confetti-silver" style="animation-delay: 0.4s;">⭐</div>
                        <div class="confetti-silver" style="animation-delay: 0.8s;">🏆</div>
                        <div class="confetti-silver" style="animation-delay: 1.2s;">✨</div>
                        <div class="confetti-silver" style="animation-delay: 1.6s;">🎉</div>
                        <div class="confetti-silver" style="animation-delay: 2.0s;">💫</div>
                        <div class="confetti-silver" style="animation-delay: 2.4s;">🥈</div>
                        <div class="confetti-silver" style="animation-delay: 2.8s;">⭐</div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes confetti-fall-silver {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
                
                @keyframes glow-silver {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(192, 192, 192, 0.6);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(192, 192, 192, 0.9);
                    }
                }
                
                .confetti-silver {
                    position: absolute;
                    font-size: 2rem;
                    animation: confetti-fall-silver 3.5s infinite linear;
                    left: calc(10% + var(--random-x, 0) * 80%);
                    top: -10%;
                }
                
                .confetti-silver:nth-child(1) { left: 10%; animation-duration: 3s; }
                .confetti-silver:nth-child(2) { left: 25%; animation-duration: 3.5s; }
                .confetti-silver:nth-child(3) { left: 40%; animation-duration: 3.2s; }
                .confetti-silver:nth-child(4) { left: 55%; animation-duration: 3.8s; }
                .confetti-silver:nth-child(5) { left: 70%; animation-duration: 3.3s; }
                .confetti-silver:nth-child(6) { left: 85%; animation-duration: 3.6s; }
                .confetti-silver:nth-child(7) { left: 15%; animation-duration: 3.4s; }
                .confetti-silver:nth-child(8) { left: 90%; animation-duration: 3.7s; }
                
                .bg-gradient-to-r {
                    animation: glow-silver 2s infinite ease-in-out;
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
