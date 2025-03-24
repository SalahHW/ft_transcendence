import { renderLogin } from "./components/login";

const appElement = document.getElementById("app");
if (appElement) {
	appElement.appendChild(renderLogin());
}