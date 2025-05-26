/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:53 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/26 20:42:58 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import HomePage from "./views/homePage.js"

document.addEventListener("DOMContentLoaded", () => {
	const homePage = new HomePage("app-container");
	homePage.render();
});
