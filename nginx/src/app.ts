import Router from "./router/router.js";

document.addEventListener("DOMContentLoaded", () => {
    const router = Router.getInstance("app-container");
    router.init();
});
