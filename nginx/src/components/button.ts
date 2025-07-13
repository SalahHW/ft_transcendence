import { COMMON_CLASSES } from "../style/tailwindClasses.js";

export interface ButtonOptions {
	id?: string;
	label?: string;
	type?: `button` | `submit` | `reset`;
	style?: `primary` | `secondary` | string;
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
