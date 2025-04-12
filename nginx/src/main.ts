import ApiTestPage from "./views/ApiTestPage.js"

document.addEventListener("DOMContentLoaded", () => {
	const apiTestPage = new ApiTestPage("app-container");
	apiTestPage.render();
	console.log("API Test Page loaded ✅");
});
