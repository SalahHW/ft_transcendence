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
import AuthNanoService from "./auth/AuthNanoService.js";

document.addEventListener("DOMContentLoaded", async () => {
  const router = Router.getInstance();
  router.init();

  new Wheel("wheel-container");

  const auth = AuthNanoService.getInstance();
  await auth.isLoggedIn();
});
