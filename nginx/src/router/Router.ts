// TODO: Clean up this class
// TODO: (opt) Add views for different forms in APITestPage

interface Route {
  path: string;
  cache?: any;
  handler: () => void | Promise<void>;
}

export default class Router {
  private constructor() {
    this._currentPath = this.getCurrentPath();
  }
  private static _instance: Router;
  private _currentPath: string;

  private _routes: Route[] = [
    {
      path: "/",
      handler: async function () {
        if (!this.cache) {
          const module = await import("../views/homePage.js");
          this.cache = new module.default("app-container");
        }
        this.cache.render();
      },
    },
    {
      path: "/api-test",
      handler: async function () {
        if (!this.cache) {
          const module = await import("../views/apiTestPage/APITestPage.js");
          this.cache = new module.default();
        }
        this.cache.show();
      },
    },
    {
      path: "/credential-login",
      handler: async function () {
        if (!this.cache) {
          const module = await import("../components/LoginPopup.js");
          this.cache = new module.default();
        }
        this.cache.show();
      },
    },
    {
      path: "/credential-register",
      handler: async function () {
        if (!this.cache) {
          const module = await import("../components/RegisterPopup.js");
          this.cache = new module.default();
        }
        this.cache.show();
      },
    },
    {
      path: "/profile",
      handler: async function () {
        if (!this.cache) {
          const module = await import("../views/profile/ProfileView.js");
          this.cache = new module.default();
        }
        this.cache.show();
        this.cache.render();
      },
    },
    {
      path: "/1v1",
      handler: async function () {
        // @ts-ignore
        const { handleSimpleMatch } = await import("/js/game.bundle.js");
        await handleSimpleMatch(this);
      },
    },
    {
      path: "/tournament",
      handler: async function () {
        // @ts-ignore
        const { handleTournament } = await import("/js/game.bundle.js");
        await handleTournament(this);
      },
    },
    {
      path: "/wallet-register",
      handler: async function () {
        if (!this.cache) {
          const module = await import("../components/walletRegisterPopUp.js");
          this.cache = new module.default();
        }
        this.cache.show();
      },
    },
  ];

  public static getInstance(): Router {
    if (!Router._instance) {
      Router._instance = new Router();
    }
    return Router._instance;
  }

  public clearAllRouteCaches(): void {
    this._routes.forEach((route) => {
      if (route.cache) {
        if (typeof route.cache.cleanup === 'function') {
          try {
            route.cache.cleanup();
          } catch (error) {
            console.error(
              `Error during ${route.path} route cleanup on logout:`,
              error,
            );
          }
        }
        route.cache = undefined;
      }
    });
  }

  private _executeHandler(path: string) {
    var route = this._routes.find((route) => route.path === path);
    if (route?.handler) {
      route.handler.call(route);
      return true;
    }
    console.warn(`No handler found for route: ${path}`);
    return false;
  }

  private _cleanupCurrentRoute(path: string): void {
    if ((window as any).routeCleanupInProgress) {
      return;
    }
    (window as any).routeCleanupInProgress = true;

    const routeToCleanup = this._routes.find((route) => route.path === path);

    if (routeToCleanup?.cache?.cleanup) {
      try {
        routeToCleanup.cache.cleanup();
      } catch (error) {
        console.error(`Error during ${path} route cleanup:`, error);
      }
    }

    if (path === "/1v1" || path === "/tournament") {
      if ((window as any).leaveGame) {
        try {
          (window as any).leaveGame();
        } catch (error) {
          console.error("Error during global game cleanup:", error);
        }
      }
      if ((window as any).gameControlsInitialized) {
        (window as any).gameControlsInitialized = false;
      }
      if ((window as any).joinGameButtonSetup) {
        (window as any).joinGameButtonSetup = false;
      }
    }

    setTimeout(() => {
      (window as any).routeCleanupInProgress = false;
    }, 100);
  }

  private _isValidRoute(path: string): boolean {
    return this._routes.some((route) => route.path === path);
  }

  private _redirectToHome(): void {
    if ((window as any).redirectingToHome) {
      return;
    }

    (window as any).redirectingToHome = true;

    try {
      window.history.replaceState({ path: "/" }, "", "/");
      this._executeHandler("/");
    } catch (error) {
      console.error("Error redirecting to home:", error);
      window.location.pathname = "/";
    } finally {
      setTimeout(() => {
        (window as any).redirectingToHome = false;
      }, 100);
    }
  }

  public navigate(path: string, replaceState: boolean = false): boolean {
    if ((window as any).navigationInProgress) {
      return false;
    }

    (window as any).navigationInProgress = true;

    try {
      if (this._isValidRoute(path)) {
        const previousPath = this._currentPath;

        if (replaceState) window.history.replaceState({ path }, "", path);
        else window.history.pushState({ path }, "", path);

        this._currentPath = path;

        if (path !== previousPath) {
          this._cleanupCurrentRoute(previousPath);
        }
        this._executeHandler(path);

        return true;
      } else {
        console.warn(`Route not found: ${path}`);
        if (path !== "/") this._redirectToHome();
        return false;
      }
    } catch (error) {
      console.error(`Error navigating to ${path}:`, error);
      return false;
    } finally {
      setTimeout(() => {
        (window as any).navigationInProgress = false;
      }, 100);
    }
  }

  public getCurrentPath(): string {
    return window.location.pathname;
  }

  private _handlePopState = (): void => {
    if ((window as any).popstateInProgress) {
      return;
    }

    (window as any).popstateInProgress = true;

    try {
      const previousPath = this._currentPath;
      const newPath = this.getCurrentPath();
      this._currentPath = newPath;

      this._cleanupCurrentRoute(previousPath);

      if (!this._executeHandler(newPath)) {
        if (newPath !== "/") {
          window.history.replaceState({ path: "/" }, "", "/");
          window.location.pathname = "/";
        }
      }
    } catch (error) {
      console.error("Error in popstate handler:", error);
      window.location.pathname = "/";
    } finally {
      setTimeout(() => {
        (window as any).popstateInProgress = false;
      }, 100);
    }
  };

  public init(): void {
    window.addEventListener("popstate", this._handlePopState);

    this._currentPath = this.getCurrentPath();
    if (!this._isValidRoute(this._currentPath)) this.navigate("/", true);
    else this.navigate(this._currentPath, true);
  }
}
