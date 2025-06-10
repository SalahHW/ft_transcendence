/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Router.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:40:51 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/04 15:01:59 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// TODO: Mettre cette classe ça au propre
// TODO: (opt) Mettre des views pour les differents forms de APITestPage

import APITestPage from "../views/apiTestPage/APITestPage.js";
import HomePage from "../views/homePage.js";
import GamePage from "../views/gamePage.js";
import { getCurrentUser, getUserResponseData, registerCurrentUserForGame } from "../game/utils/fetch.js";

interface Route {
	path: string;
	cache?: any;
	handler: () => void;
}

export default class Router {
	private constructor() {}
	private static	_instance: Router;

	private			_routes: Route[] = [
		{
			path: "/",
			handler: function() {
				if (!this.cache)
					this.cache = new HomePage("app-container");
				this.cache.render();
			}
		},
		{
			path: "/api-test",
			handler: function() {
				if (!this.cache)
					this.cache = new APITestPage("app-container");
				this.cache.render();
			}
		},
		{
			path: "/1v1",
			handler: async function() {
				try {
					const username = await getUserResponseData("username");
					
					// Register the current user for the game
					const playerData = await registerCurrentUserForGame();
					
					// Create and render the game page
					if (!this.cache) {
						this.cache = new GamePage("app-container");
					}
					this.cache.render();
					
					// Load the pre-bundled game client
					const gameBundlePath = "/js/game.bundle.js";
					const gameClientModule = await import(gameBundlePath);
					
					await gameClientModule.initializeGame(playerData.id);
					
				} catch (error) {
					console.error("Error registering user for game:", error);
					alert(`Failed to register for 1v1 game: ${error.message}`);
				}
			}
		},
		{
			path: "/tournament",
			handler: function() {
				console.log("Tournament page handler called");
				// TODO: Implement tournament page by adding your function
			}
		}
	];

	public static getInstance(): Router {
		if (!Router._instance) {
			Router._instance = new Router();
		}
		return Router._instance;
	}

	private _executeHandler(path: string) {
		var route = this._routes.find(route => route.path === path);
		if (route?.handler) {
			route.handler();
			return true;
		}
		console.warn(`No handler found for route: ${path}`);
		return false;
	}

	private _isValidRoute(path: string): boolean {
		return this._routes.some(route => route.path === path);
	}

	private _redirectToHome(): void {
		window.history.replaceState({ path: '/' }, '', '/');
		this._executeHandler('/');
	}

	public navigate(path: string, replaceState: boolean = false): boolean {
		if (this._isValidRoute(path)) {
			if (replaceState)
				window.history.replaceState({ path }, '', path);
			else
				window.history.pushState({ path }, '', path);

			this._executeHandler(path);
			return true;
		}
		else {
			console.warn(`Route not found: ${path}`);
			if (path !== '/')
				this._redirectToHome();
			return false;
		}
	}

	public getCurrentPath(): string {
		return window.location.pathname;
	}

	private _handlePopState = (): void => {
		const path = this.getCurrentPath();

		if (!this._executeHandler(path)) {
			console.warn(`Popstate: route not found: ${path}`);
			if (path !== '/') {
				this._redirectToHome();
			}
		}
	}

	public init(): void {
		window.addEventListener('popstate', this._handlePopState);

		const currentPath = this.getCurrentPath();
		if (!this._isValidRoute(currentPath))
			this.navigate('/', true);
		 else
			this.navigate(currentPath, true);
	}



	// public destroy(): void {
	// 	if (this._initialized) {
	// 		window.removeEventListener('popstate', this._handlePopState);
	// 		this._initialized = false;
	// 	}
	// }
}
