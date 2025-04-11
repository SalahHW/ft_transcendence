import ApiTestPage from "./page/ApiTestPage"

document.addEventListener("DOMContentLoaded", () => {
	const apiTestPage = new ApiTestPage("app");
	apiTestPage.render();
	console.log("API Test Page loaded ✅");
});

