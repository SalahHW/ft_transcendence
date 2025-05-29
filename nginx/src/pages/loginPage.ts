export function createLoginPage(): HTMLElement {
  const container = document.createElement("div");

  const title = document.createElement("h2");
  title.textContent = "Login Page";

  container.appendChild(title);
  return container;
}
