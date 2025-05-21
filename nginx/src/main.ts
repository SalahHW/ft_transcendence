import HomePage from "./views/homePage.js"

document.addEventListener("DOMContentLoaded", () => {
	const homePage = new HomePage("app-container");
	homePage.render();
});
