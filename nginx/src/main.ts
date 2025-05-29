import { render } from "./utils/render";
import { createHomePage } from "./pages/homePage";
import { createLoginPage } from "./pages/loginPage";

function goToLoginPage() {
  render(createLoginPage());
}

render(createHomePage(goToLoginPage));
