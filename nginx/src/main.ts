import Wheel from "./components/Wheel.js";
import Router from "./router/Router.js";
import AuthService from "./services/AuthNanoService.js";
import { initializeServices } from "./services/serviceInitializer.js";

/**
 * Main application class.
 * Encapsulates the entire application's startup logic.
 */
class App {
  constructor() {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    console.log("Initializing application...");

    initializeServices();

    const router = Router.getInstance();
    router.init();

    try {
      const auth = AuthService.getInstance();
      const loggedIn = await auth.isLoggedIn();
      if (loggedIn) {
        console.info("[INIT] Active session detected. Refresh loop started.");
      } else {
        console.info("[INIT] No active session found.");
      }
    } catch (err) {
      console.warn("[INIT] Error during session initialization:", err);
    }

    new Wheel("wheel-container");

    console.log("Application initialized successfully.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
