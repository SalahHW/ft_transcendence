import { createTitle } from "../components/title";
import { createLoginButton } from "../components/loginButton";
import { createGuestButton } from "../components/guestButton";

export function createHomePage(onLoginClick: () => void): HTMLElement {
  const container = document.createElement("div");

  container.appendChild(createTitle("ft_transcendence"));
  container.appendChild(createLoginButton(onLoginClick));
  container.appendChild(createGuestButton());

  return container;
}
