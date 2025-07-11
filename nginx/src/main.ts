/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:53 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/23 14:25:38 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Wheel from "./components/Wheel.js";
import Router from "./router/Router.js";
import AuthService from "./auth/AuthNanoService.js";

document.addEventListener("DOMContentLoaded", async () => {
  const router = Router.getInstance();
  router.init();

  try {
    const auth = AuthService.getInstance();
    const loggedIn = await auth.isLoggedIn();
    if (loggedIn) {
      console.info("[INIT] Session active. Refresh loop active.");
    } else {
      console.info("[INIT] Pas de session détectée.");
    }
  } catch (err) {
    console.warn("[INIT] Erreur pendant l'init de session:", err);
  }

  new Wheel("wheel-container");
});
