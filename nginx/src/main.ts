/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:53 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 14:52:15 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Router from "./router/Router.js";

document.addEventListener("DOMContentLoaded", () => {
	const router = Router.getInstance();
	router.init();
});
