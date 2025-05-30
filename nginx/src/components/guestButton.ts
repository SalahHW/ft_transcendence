export function createGuestButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = "guest-btn";
  btn.textContent = "Play as guest";
  btn.className = "btn btn-secondary";
  return btn;
}
