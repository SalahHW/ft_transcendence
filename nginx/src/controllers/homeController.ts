export function setupHomeEvents(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    if (target.id === "login-btn") {
      console.log("Login clicked");
    }

    if (target.id === "guest-btn") {
      console.log("Guest clicked");
    }
  });
}
