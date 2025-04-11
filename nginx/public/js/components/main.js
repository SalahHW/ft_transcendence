import ApiTestPage from "./ApiTestPage";
document.addEventListener("DOMContentLoaded", function () {
    var apiTestPage = new ApiTestPage("app");
    apiTestPage.render();
    console.log("API Test Page loaded ✅");
});
