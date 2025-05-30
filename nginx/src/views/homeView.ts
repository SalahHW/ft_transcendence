import { createLoginButton } from "../components/loginButton.js";
import { createGuestButton } from "../components/guestButton.js";

export function createHomeView(onLoginClick: () => void): HTMLElement {
  const container = document.createElement("div");

  const title = document.createElement("h1");
  title.textContent = "ft_transcendence";
  title.className = "text-2xl mb-4";

  const loginBtn = createLoginButton();
  const guestBtn = createGuestButton();

  // Attache la logique ici
  loginBtn.addEventListener("click", onLoginClick);
  guestBtn.addEventListener("click", () => {
    console.log("Guest mode selected");
    // Tu peux faire render(createGuestView()) plus tard ici
  });

  container.appendChild(title);
  container.appendChild(loginBtn);
  container.appendChild(guestBtn);

  return container;
}
