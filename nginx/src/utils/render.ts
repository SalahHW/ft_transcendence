export function render(element: HTMLElement): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = "";
  app.appendChild(element);
}
