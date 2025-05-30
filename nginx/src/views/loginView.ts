export function createLoginView(): HTMLElement {
  const container = document.createElement("div");

  const title = document.createElement("h2");
  title.textContent = "Login";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Username";

  const submit = document.createElement("button");
  submit.textContent = "Submit";
  submit.addEventListener("click", () => {
    console.log(`Trying to login as: ${input.value}`);
  });

  container.appendChild(title);
  container.appendChild(input);
  container.appendChild(submit);

  return container;
}
