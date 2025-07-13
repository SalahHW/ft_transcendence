/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:53 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 14:45:50 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Wheel from "./components/Wheel.js";
import Router from "./router/Router.js";
import AuthService from "./services/AuthNanoService.js";

document.addEventListener("DOMContentLoaded", async () => {
  const router = Router.getInstance();
  router.init();

  try {
    const auth = AuthService.getInstance();
    const loggedIn = await auth.isLoggedIn();
    if (loggedIn) {
      console.info("[INIT] Active session detected. Refresh loop started.");
    } else {
      console.info("[INIT] No active session found.");
    }
  } catch (err) {
    console.warn("[INIT] Error during session initialization:", err);
  }

  new Wheel("wheel-container");
});
