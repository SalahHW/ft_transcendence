/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   routes.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/27 18:12:01 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 00:37:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import APITestPage from "../views/apiTestPage/APITestPage.js";
import HomePage from "../views/homePage.js"
import Router from "./Router.js"

interface Route {
	path: string;
	onEnter: () => void;
}

const routes: Route[] = [
	{
		path: "/",
		onEnter: () => {
			const homePage = new HomePage("app-container");
			homePage.render();
		}
	},
	{
		path: "/api-test",
		onEnter: () => {
			const apiTestPage = new APITestPage("app-container");
			apiTestPage.render();
		}
	}
];

export default function registerRoutes(): void {
	const router = Router.getInstance();

	routes.forEach(route => {
		router.addRoute(route.path, route.onEnter);
	});

	console.log(`Registered ${routes.length} routes`);
}
