import Wheel from "./components/Wheel.js";
import Router from "./router/Router.js";
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

    try {
      initializeServices();
      const router = Router.getInstance();
      router.init();
    } catch (error) {
      console.log(error);
    }

    new Wheel("wheel-container");

    console.log("Application initialized successfully.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
