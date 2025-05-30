import { render } from "./utils/render.js";
import { createHomeView } from "./views/homeView.js";
import { createLoginView } from "./views/loginView.js";

function goToLogin() {
  render(createLoginView());
}

render(createHomeView(goToLogin));
