import ApiTestPage from "./components/testsAPI/ApiTestPage"

document.addEventListener("DOMContentLoaded", () => {
	const apiTestPage = new ApiTestPage("app");
	apiTestPage.render();
	console.log("API Test Page loaded ✅");
});

