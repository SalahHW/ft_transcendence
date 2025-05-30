export function createLoginButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = "login-btn";
  btn.textContent = "Login";
  btn.className = "btn btn-primary";
  return btn;
}
