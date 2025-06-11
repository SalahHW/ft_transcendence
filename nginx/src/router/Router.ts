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
					
					// **CRITICAL FIX**: Explicitly setup button handlers (no side effects)
					if (gameClientModule.setupJoinGameButton) {
						gameClientModule.setupJoinGameButton();
					}
					
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
		// **CRITICAL FIX**: Clean up ANY route when navigating away
		// Don't clean up during popstate events (back navigation) as cleanup should already be done
		const currentPath = this.getCurrentPath();
		const isLeavingRoute = path !== currentPath;
		const isPopstateNavigation = (window as any).popstateInProgress;
		
		if (isLeavingRoute && !isPopstateNavigation) {
			console.log(`🧹 Navigating away from ${currentPath} to ${path}, cleaning up...`);
			this._cleanupCurrentRoute();
		}
		
		var route = this._routes.find(route => route.path === path);
		if (route?.handler) {
			route.handler();
			return true;
		}
		console.warn(`No handler found for route: ${path}`);
		return false;
	}

	private _cleanupCurrentRoute(): void {
		// **CRITICAL FIX**: Universal cleanup for any route
		const currentPath = this.getCurrentPath();
		if (!(window as any).routeCleanupInProgress) {
			console.log(`🧹 Leaving route ${currentPath} - cleaning up...`);
			
			// Set flag to prevent double cleanup
			(window as any).routeCleanupInProgress = true;
			
			// **CRITICAL**: Clean up current route's cached component if it has cleanup method
			const currentRoute = this._routes.find(route => route.path === currentPath);
			if (currentRoute?.cache?.cleanup) {
				try {
					console.log(`🧹 Calling cleanup for ${currentPath} route...`);
					currentRoute.cache.cleanup();
				} catch (error) {
					console.error(`Error during ${currentPath} route cleanup:`, error);
				}
			}
			
			// **CRITICAL**: Special cleanup for game routes
			if (currentPath === '/1v1' || currentPath === '/tournament') {
				// Call cleanup if available globally
				if ((window as any).leaveGame) {
					try {
						(window as any).leaveGame();
					} catch (error) {
						console.error('Error during global game cleanup:', error);
					}
				}
				
				// Additional cleanup for global game state
				if ((window as any).gameControlsInitialized) {
					(window as any).gameControlsInitialized = false;
				}
				if ((window as any).joinGameButtonSetup) {
					(window as any).joinGameButtonSetup = false;
				}
			}
			
			// Clear the cleanup flag after a short delay
			setTimeout(() => {
				(window as any).routeCleanupInProgress = false;
			}, 100);
		}
	}

	private _isValidRoute(path: string): boolean {
		return this._routes.some(route => route.path === path);
	}

	private _redirectToHome(): void {
		// **CRITICAL FIX**: Prevent recursive calls by checking if we're already redirecting
		if ((window as any).redirectingToHome) {
			console.warn('Already redirecting to home, ignoring...');
			return;
		}
		
		(window as any).redirectingToHome = true;
		
		try {
			console.log('🏠 Redirecting to home...');
			window.history.replaceState({ path: '/' }, '', '/');
			this._executeHandler('/');
		} catch (error) {
			console.error('Error redirecting to home:', error);
			// Force navigation on error
			window.location.pathname = '/';
		} finally {
			setTimeout(() => {
				(window as any).redirectingToHome = false;
			}, 100);
		}
	}

	public navigate(path: string, replaceState: boolean = false): boolean {
		// **CRITICAL FIX**: Prevent recursive navigation
		if ((window as any).navigationInProgress) {
			console.warn(`Navigation already in progress, ignoring navigate to: ${path}`);
			return false;
		}
		
		(window as any).navigationInProgress = true;
		
		try {
			console.log(`🧭 Navigating to: ${path}`);
			
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
		// **CRITICAL FIX**: Prevent recursive popstate handling
		if ((window as any).popstateInProgress) {
			console.warn('Popstate already in progress, ignoring...');
			return;
		}
		
		(window as any).popstateInProgress = true;
		
		try {
			const path = this.getCurrentPath();
			console.log(`🔄 Handling popstate to: ${path}`);

			if (!this._executeHandler(path)) {
				console.warn(`Popstate: route not found: ${path}`);
				if (path !== '/') {
					console.log('🏠 Redirecting to home from popstate...');
					// **CRITICAL**: Use replaceState without calling _executeHandler to prevent recursion
					window.history.replaceState({ path: '/' }, '', '/');
					// Force a page reload instead of recursive navigation
					window.location.pathname = '/';
				}
			}
		} catch (error) {
			console.error('Error in popstate handler:', error);
			// Force navigation to home on error
			window.location.pathname = '/';
		} finally {
			// Clear the flag after a short delay
			setTimeout(() => {
				(window as any).popstateInProgress = false;
			}, 100);
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
