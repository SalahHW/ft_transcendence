/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   router.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:40:51 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 00:36:15 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export default class Router {
	private static _instance: Router;
	private _routes: Map<string, () => void>;
	private _initialized: boolean = false;

	private constructor() {
		this._routes = new Map();
	}

	public static getInstance(): Router {
		if (!Router._instance) {
			Router._instance = new Router();
		}
		return Router._instance;
	}

	public addRoute(path: string, handler: () => void): void {
		this._routes.set(path, handler);
	}

	private _executeHandler(path: string): boolean {
		const handler = this._routes.get(path);
		if (handler) {
			handler();
			return true;
		}
		return false;
	}

	private _isValidRoute(path: string): boolean {
		return this._routes.has(path);
	}

	private _redirectToHome(): void {
		window.history.replaceState({ path: '/' }, '', '/');
		this._executeHandler('/');
	}

	public navigate(path: string, replaceState: boolean = false): boolean {
		if (this._isValidRoute(path)) {
			if (replaceState) {
				window.history.replaceState({ path }, '', path);
			} else {
				window.history.pushState({ path }, '', path);
			}

			this._executeHandler(path);
			return true;
		} else {
			console.warn(`Route not found: ${path}`);
			if (path !== '/') {
				this._redirectToHome();
			}
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
		if (this._initialized) {
			console.warn('Router already initialized');
			return;
		}

		window.addEventListener('popstate', this._handlePopState);

		const currentPath = this.getCurrentPath();
		const shouldRedirectToHome = currentPath === '/public/index.html' ||
									  !this._isValidRoute(currentPath);

		if (shouldRedirectToHome) {
			this.navigate('/', true);
		} else {
			this.navigate(currentPath, true);
		}

		this._initialized = true;
	}

	public destroy(): void {
		if (this._initialized) {
			window.removeEventListener('popstate', this._handlePopState);
			this._initialized = false;
		}
	}
}
