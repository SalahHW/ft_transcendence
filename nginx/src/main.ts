import { render } from "./utils/render.js";
import { createHomePage } from "./pages/homePage.js";
import { createLoginPage } from "./pages/loginPage.js";

function goToLoginPage() {
  render(createLoginPage());
}

render(createHomePage(goToLoginPage));
