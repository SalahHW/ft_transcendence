/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   button.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 21:05:46 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/31 16:01:54 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { COMMON_CLASSES } from "../style/tailwindClasses.js";

export interface ButtonOptions {
	id?: string;
	label?: string;
	type?: `button` | `submit` | `reset`;
	style?: `primary` | `secondary`;
	svgIcon?: string;
}

export function buttonHTML(options: ButtonOptions = {}): string {
	const button = document.createElement('button');

	if (options.id)
		button.id = options.id;
	if (options.type)
		button.type = options.type;
	else
		button.type = 'button';
	if (options.svgIcon)
		button.innerHTML += options.svgIcon;
	if (options.label)
		button.innerHTML += options.label;
	if (options.style === 'primary')
		button.className = COMMON_CLASSES.primaryButton;
	else
		button.className = COMMON_CLASSES.secondaryButton;

	return (button.outerHTML);
}
