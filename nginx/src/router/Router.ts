/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Router.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: Invalid Date        by              +#+  #+#    #+#             */
/*   Updated: 2025/07/05 15:13:45 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


// TODO: Mettre cette classe ça au propre
// TODO: (opt) Mettre des views pour les differents forms de APITestPage

interface Route {
	path: string;
	cache?: any;
	handler: () => void | Promise<void>;
}

export default class Router {
	private constructor() {}
	private static	_instance: Router;

	private			_routes: Route[] = [
		{
			path: "/",
			handler: function() {
				if (!this.cache) {
					import('../views/homePage.js').then(module => {
						const HomePage = module.default;
						this.cache = new HomePage("app-container");
						this.cache.render();
					});
				} else {
					this.cache.render();
				}
			}
		},
		{
			path: "/api-test",
			handler: async function() {
				window.history.back();
				if (!this.cache) {
					import('../views/apiTestPage/APITestPage.js').then(module => {
						const APITestPage = module.default;
						this.cache = new APITestPage();
						this.cache.show();
					});
				} else {
					this.cache.show();
				}
			}
		},
		{
			path: "/login",
			handler: async function() {
				window.history.back();
				if (!this.cache) {
					import('../components/LoginPopup.js').then(module => {
						const LoginPopup = module.default;
						this.cache = new LoginPopup();
						this.cache.show();
					});
				} else {
					this.cache.show();
				}
			}
		},
		{
			path: "/register",
			handler: async function() {
				window.history.back();
				if (!this.cache) {
					import('../components/RegisterPopup.js').then(module => {
						const RegisterPopup = module.default;
						this.cache = new RegisterPopup();
						this.cache.show();
					});
				} else {
					this.cache.show();
				}
			}
		},
		{
			path: "/register-wallet",
			handler: function() {
				window.history.back();
				if (!this.cache) {
					import('../components/WalletConnectRegisterPopup.js').then(module => {
						const WalletConnectRegisterPopup = module.default;
						this.cache = new WalletConnectRegisterPopup();
						this.cache.show();
					});
				} else {
					this.cache.show();
				}
			}
		},
		{
			path: "/profile",
			handler: async function() {
				window.history.back();
				if (!this.cache) {
					import('../views/ProfileView.js').then(module => {
						const ProfileView = module.default;
						this.cache = new ProfileView();
						this.cache.show();
					});
				} else {
					this.cache.show();
				}
			}
		},
		{
			path: "/1v1",
			handler: async function() {
				// @ts-ignore
				const { handleSimpleMatch } = await import('/js/game.bundle.js');
				await handleSimpleMatch(this);
			}
		},
		{
			path: "/tournament",
			handler: async function() {
				// @ts-ignore
				const { handleTournament } = await import('/js/game.bundle.js');
				await handleTournament(this);
			}
		}
	];

	public static getInstance(): Router {
		if (!Router._instance) {
			Router._instance = new Router();
		}
		return Router._instance;
	}

	private async _executeHandler(path: string): Promise<boolean> {
		// **CRITICAL FIX**: Clean up ANY route when navigating away
		// Don't clean up during popstate events (back navigation) as cleanup should already be done
		const currentPath = this.getCurrentPath();
		const isLeavingRoute = path !== currentPath;
		const isPopstateNavigation = (window as any).popstateInProgress;

		if (isLeavingRoute && !isPopstateNavigation) {
			this._cleanupCurrentRoute();
		}

		const route = this._routes.find(route => route.path === path);
		if (route?.handler) {
			try {
				await route.handler();
			} catch (error) {
				console.error(`Error in handler for route ${path}:`, error);
			}
			return true;
		}
		console.warn(`No handler found for route: ${path}`);
		return false;
	}

	private _cleanupCurrentRoute(): void {
		const currentPath = this.getCurrentPath();
		if (!(window as any).routeCleanupInProgress) {
			// Set flag to prevent double cleanup
			(window as any).routeCleanupInProgress = true;

			// **CRITICAL**: Clean up current route's cached component if it has cleanup method
			const currentRoute = this._routes.find(route => route.path === currentPath);
			if (currentRoute?.cache?.cleanup) {
				try {
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

	private async _redirectToHome(): Promise<void> {
		// **CRITICAL FIX**: Prevent recursive calls by checking if we're already redirecting
		if ((window as any).redirectingToHome) {
			return;
		}

		(window as any).redirectingToHome = true;

		try {
			window.history.replaceState({ path: '/' }, '', '/');
			await this._executeHandler('/');
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

	public async navigate(path: string, replaceState: boolean = false): Promise<boolean> {
		// **CRITICAL FIX**: Prevent recursive navigation
		if ((window as any).navigationInProgress) {
			return false;
		}

		(window as any).navigationInProgress = true;

		try {
			if (this._isValidRoute(path)) {
				if (replaceState)
					window.history.replaceState({ path }, '', path);
				else
					window.history.pushState({ path }, '', path);

				await this._executeHandler(path);
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

	private _handlePopState = async (): Promise<void> => {
		// **CRITICAL FIX**: Prevent recursive popstate handling
		if ((window as any).popstateInProgress) {
			return;
		}

		(window as any).popstateInProgress = true;

		try {
			const path = this.getCurrentPath();

			if (!this._executeHandler(path)) {
				if (path !== '/') {
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
}
