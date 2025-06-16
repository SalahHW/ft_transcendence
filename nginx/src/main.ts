/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:53 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/16 18:48:37 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Wheel from "./components/Wheel.js";
import Router from "./router/Router.js";
import LoginPopup from "./components/LoginPopup.js";
import RegisterPopup from "./components/RegisterPopup.js";

document.addEventListener("DOMContentLoaded", () => {
	const router = Router.getInstance();
	router.init();

	const wheel = new Wheel("wheel-container");
	wheel.render();

	// Initialiser les popups
	new LoginPopup("popup-container");
	new RegisterPopup("popup-container");
});
