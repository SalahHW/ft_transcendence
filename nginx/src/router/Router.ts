/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   router.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:40:51 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/21 16:55:06 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// TODO: Mettre cette classe ça au propre
// TODO: (opt) Mettre des views pour les differents forms de APITestPage

import APITestPage from "../views/apiTestPage/APITestPage.js";
import HomePage from "../views/homePage.js";
import LoginPopup from "../components/LoginPopup.js";
import RegisterPopup from "../components/RegisterPopup.js";
import ProfileView from "../views/ProfileView.js";
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
			path: "/login",
			handler: function() {
				// Revenir à la page précédente dans l'historique
				window.history.back();

				// Afficher la popup de login
				if (!this.cache)
					this.cache = new LoginPopup();
				this.cache.show();
			}
		},
		{
			path: "/register",
			handler: function() {
				// Revenir à la page précédente dans l'historique
				window.history.back();

				// Afficher la popup de register
				if (!this.cache)
					this.cache = new RegisterPopup();
				this.cache.show();
			}
		},
		{
			path: "/profile",
			handler: function() {
				// Revenir à la page précédente dans l'historique
				window.history.back();

				// Afficher la vue de profil
				if (!this.cache)
					this.cache = new ProfileView();
				this.cache.show();
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
