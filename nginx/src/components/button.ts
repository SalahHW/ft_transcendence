import { COMMON_CLASSES } from "../style/tailwindClasses";

export interface ButtonOptions {
	id?: string;
	text?: string;
	type?: `button` | `submit` | `reset`;
	svgIcon?: string;
}

export function buttonHTML(options: ButtonOptions = {}): string {
	const button: string = /* HTML */ `
		<button type="${options.type || `button`}" ${options.id ? `id=${options.id}` : ``} class="${COMMON_CLASSES.button}">
			${options.svgIcon}
			${options.text}
		</button>
	`;
	return (button);
}
