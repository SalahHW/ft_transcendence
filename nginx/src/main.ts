/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:53 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 00:11:52 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Router from "./router/Router.js";
import registerRoutes from "./router/routes.js";

document.addEventListener("DOMContentLoaded", () => {
	const router = Router.getInstance();
	registerRoutes();
	router.init();
});
