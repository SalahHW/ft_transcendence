import { UI_THEME } from "../style/tailwindClasses.js";

function hexToRgba(hex: string, alpha: number): string {
	let r = 0,
		g = 0,
		b = 0;
	if (hex.length === 4) {
		r = parseInt(hex[1] + hex[1], 16);
		g = parseInt(hex[2] + hex[2], 16);
		b = parseInt(hex[3] + hex[3], 16);
	} else if (hex.length === 7) {
		r = parseInt(hex.slice(1, 3), 16);
		g = parseInt(hex.slice(3, 5), 16);
		b = parseInt(hex.slice(5, 7), 16);
	}
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

class NotificationService {
	private static instance: NotificationService;
	private notificationContainer: HTMLElement;

	private constructor() {
		this.notificationContainer = document.createElement("div");
		this.notificationContainer.className =
			"fixed top-3/4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col-reverse items-center gap-2 pointer-events-none";
		document.body.appendChild(this.notificationContainer);
	}

	public static getInstance(): NotificationService {
		if (!NotificationService.instance) {
			NotificationService.instance = new NotificationService();
		}
		return NotificationService.instance;
	}

	private formatMessage(message: string): string {
		const words = message.split(" ");
		const lines = [];
		let currentLine = "";

		for (const word of words) {
			if (currentLine.length + word.length + 1 > 50) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = currentLine ? `${currentLine} ${word}` : word;
			}
		}
		if (currentLine) {
			lines.push(currentLine);
		}

		return lines.join("<br>");
	}

	public show(
		message: string,
		type: "success" | "error",
		duration: number = 3000
	): void {
		// Log to console for debugging
		if (type === "success") {
			console.log(`[Notification] ${message}`);
		} else {
			console.error(`[Notification] ${message}`);
		}

		const notificationElement = document.createElement("div");

		notificationElement.className =
			"px-6 py-4 rounded-3xl text-2xl text-center shadow-lg transition-all duration-300 pointer-events-auto";

		const formattedMessage = this.formatMessage(message);
		notificationElement.innerHTML = formattedMessage;

		if (type === "success") {
			notificationElement.style.color = UI_THEME.colors.green.light;
			notificationElement.style.backgroundColor = hexToRgba(
				UI_THEME.colors.green.dark,
				0.3
			);
		} else {
			// error
			notificationElement.style.color = UI_THEME.colors.red.light;
			notificationElement.style.backgroundColor = hexToRgba(
				UI_THEME.colors.red.dark,
				0.3
			);
		}

		this.notificationContainer.prepend(notificationElement);

		let timeoutId: number;

		const startTimeout = () => {
			timeoutId = window.setTimeout(() => {
				notificationElement.style.opacity = "0";
				notificationElement.addEventListener("transitionend", () => {
					notificationElement.remove();
				});
			}, duration);
		};

		const pauseTimeout = () => {
			clearTimeout(timeoutId);
		};

		notificationElement.addEventListener("mouseenter", pauseTimeout);
		notificationElement.addEventListener("mouseleave", startTimeout);

		notificationElement.style.opacity = "0";
		requestAnimationFrame(() => {
			notificationElement.style.opacity = "1";
		});

		startTimeout();
	}
}

export default NotificationService.getInstance();
