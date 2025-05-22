import HomePage from "../views/homePage.js";
import ApiTestPage from "../views/apiTestPage/ApiTestPage.js";

type Route = {
    path: string;
    view: new (containerId: string) => { render: () => void };
};

export default class Router {
    private static instance: Router;
    private routes: Route[];
    private container: string;

    private constructor(containerId: string) {
        this.container = containerId;
        this.routes = [
            {
                path: "/", view: HomePage
            },
            {
                path: "/api-test", view: ApiTestPage
            }
        ];

        // Gérer la navigation avec les boutons du navigateur
        window.addEventListener("popstate", () => {
            this.navigate(window.location.pathname, false);
        });
    }

    public static getInstance(containerId: string): Router {
        if (!Router.instance) {
            Router.instance = new Router(containerId);
        }
        return Router.instance;
    }

    public navigate(path: string, addToHistory: boolean = true): void {
        // Ajouter à l'historique si nécessaire
        if (addToHistory) {
            history.pushState(null, "", path);
        }

        // Trouver et rendre la vue correspondante
        const route = this.routes.find(route => route.path === path);
        if (route) {
            const view = new route.view(this.container);
            view.render();
        }
        else {
            // Rediriger vers la page d'accueil si la route n'existe pas
            this.navigate("/", true);
        }
    }

    public init(): void {
        // Gérer la navigation initiale
        this.navigate(window.location.pathname, false);
    }
}
