export function createLoginButton(onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = "login-btn";
  btn.textContent = "Login";
  btn.addEventListener("click", onClick);
  return btn;
}