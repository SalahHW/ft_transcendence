import { renderLogin } from "./components/login";
var appElement = document.getElementById("app");
if (appElement) {
    appElement.appendChild(renderLogin());
}
