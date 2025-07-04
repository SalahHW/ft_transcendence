/**
 * Utility functions for managing popup UI elements like loading buttons and messages.
 */

export function setButtonLoading(
  button: HTMLButtonElement,
  isLoading: boolean,
  label: string = "Submit"
): void {
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `
      <svg class="animate-spin h-5 w-5 mr-2 inline-block text-white"
           xmlns="http://www.w3.org/2000/svg"
           fill="none"
           viewBox="0 0 24 24">
        <circle class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"></circle>
        <path class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z">
        </path>
      </svg>
      Processing...
    `;
  } else {
    button.disabled = false;
    button.textContent = label;
  }
}

/**
 * Display a temporary message in a message element.
 *
 * @param element The target HTML element (typically a `<div>`) for the message.
 * @param message The message string to display.
 * @param colorClass A TailwindCSS class indicating the message color.
 * @param duration Duration before auto-hide (default: 3s)
 */
export function showMessage(
  element: HTMLElement | null,
  message: string,
  colorClass: string,
  duration: number = 3000
): void {
  if (!element) return;

  element.className = `${colorClass} opacity-100 visible transition-all duration-200`;
  element.textContent = message;

  setTimeout(() => {
    element.classList.remove("opacity-100", "visible");
    element.classList.add("opacity-0", "invisible");
    setTimeout(() => {
      element.textContent = "";
    }, 200);
  }, duration);
}
