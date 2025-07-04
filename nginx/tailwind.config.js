/** @type {import('tailwindcss').Config} */
export const theme = {
	extend: {
		fontFamily: {
			sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
			mono: ['Source Code Pro', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
		},
		colors: {
			'custom-dark': '#313131',
			'custom-gray': '#5A5A5A',
		},
	},
};
export const plugins = [];
