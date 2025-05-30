import { createTitle } from "../components/title.js";
import { createLoginButton } from "../components/loginButton.js";
import { createGuestButton } from "../components/guestButton.js";

export function createHomePage(onLoginClick: () => void): HTMLElement {
  const container = document.createElement("div");

  container.appendChild(createTitle("ft_transcendence"));
  container.appendChild(createLoginButton(onLoginClick));
  container.appendChild(createGuestButton());

  return container;
}
