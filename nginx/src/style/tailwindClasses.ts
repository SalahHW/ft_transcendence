/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   tailwindClasses.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:41:14 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/08 18:14:45 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Styles communs pour la Wheel et les Popups
export const UI_THEME = {
	// Couleurs et apparences de base
	colors: {
		background: {
			primary: 'rgba(31, 41, 55, 0.85)', // bg-gray-800/85
			primarySelected: 'rgba(55, 65, 81, 0.95)', // bg-gray-700/95
			secondary: 'rgba(31, 41, 55, 0.9)', // bg-gray-800/90
			overlay: 'bg-black/30 backdrop-blur-md', // Overlay avec blur
			input: 'bg-gray-700/50',
			inputFocus: 'bg-gray-700/70',
		},
		border: {
			primary: 'rgba(75, 85, 99, 0.3)', // border-gray-600/30
			primarySelected: 'rgba(156, 163, 175, 0.6)', // border-gray-400/60
		},
		text: {
			primary: 'rgb(243, 244, 246)', // text-gray-100
			secondary: 'rgb(156, 163, 175)', // text-gray-400
			placeholder: 'text-gray-400',
		},
		green: {
			light: '#30EF76',
			dark: '#0FCB53'
		},
		red: {
			light: '#F04249',
			dark: '#D41018'
		}
	},

	// Animations et transitions
	animations: {
		entrance: 'opacity-0 scale-95 transition-all duration-150 ease-out',
		visible: 'opacity-100 scale-100',
		exit: 'opacity-0 scale-95',
		hover: 'transition-all duration-200',
	},

	// Composants réutilisables
	components: {
		overlay: `fixed inset-0 z-50 hidden items-center justify-center bg-black/30 backdrop-blur-md select-none opacity-0 scale-95 transition-all duration-150 ease-out`,

		popupContainer: `relative bg-custom-dark/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-custom-gray select-none`,

		input: `w-full px-4 py-3 bg-black/20 border border-custom-gray rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:bg-black/30 transition-all duration-200`,

		button: {
			primary: `w-full py-3 bg-white/10 hover:bg-white/20 text-gray-100 font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30`,
			close: `absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 text-xl font-light`,
		},

		title: `text-2xl font-medium text-gray-100 text-center font-sans`,

		form: `space-y-4`,

		message: `text-sm text-center mt-4 transition-opacity duration-200`,
		tabs: {
			container:	`w-full`,
			tabsContainer:	`flex`,
			contentContainer:	`relative rounded-b-lg rounded-tr-lg border border-custom-gray bg-black/20 shadow-sm`,
			activeTab:	`relative z-10 bg-black/20 text-gray-100 px-6 py-3 cursor-pointer font-medium text-sm leading-5
						rounded-t-lg border-t border-l border-r border-custom-gray border-b-0 font-semibold
						focus:outline-none`,
			inactiveTab:	`relative bg-black/10 text-gray-400 px-6 py-2 cursor-pointer font-medium text-sm leading-5
							rounded-t-lg border-t border-l border-r border-transparent border-b border-custom-gray
							focus:outline-none hover:bg-black/20 hover:text-gray-200 transition-colors`,
			visibleContent:	`block p-6`,
			hiddenContent:	`hidden p-6`
		},
		terminal: {
			container: `flex flex-col h-full overflow-hidden rounded-lg bg-black/20 text-gray-100 border border-custom-gray`,
			header: `flex justify-between items-center px-3 py-2 border-b border-custom-gray`,
			clearButton: `bg-white/10 text-gray-300 border-0 rounded px-2 py-1 text-xs cursor-pointer hover:bg-white/20 transition-colors`,
			output: `flex-1 p-3 overflow-y-auto font-mono text-sm leading-6`
		}
	},

	// Styles spécifiques à la Wheel
	wheel: {
		svg: {
			fill: {
				normal: 'rgba(31, 41, 55, 0.85)',
				selected: 'rgba(55, 65, 81, 0.95)',
				hover: 'rgba(75, 85, 99, 0.9)',
				center: 'rgba(31, 41, 55, 0.9)',
			},
			stroke: {
				normal: 'rgba(75, 85, 99, 0.3)',
				selected: 'rgba(156, 163, 175, 0.6)',
			},
			text: {
				normal: 'rgb(156, 163, 175)',
				selected: 'rgb(243, 244, 246)',
				font: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
			}
		}
	}
};

// Classes CSS existantes pour compatibilité
export const COMMON_CLASSES = {
	primaryButton: /* CSS */ `px-6 py-3 bg-white/10 hover:bg-white/20 text-gray-100 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg`,
	secondaryButton:	/* CSS */ `px-4 py-2 bg-transparent hover:bg-white/10 border border-white/20 text-gray-300 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30`,
	pageContainer: /* CSS */ `container mx-auto p-4 h-[90vh] flex flex-col`,
	card: /* CSS */ `flex-1 bg-custom-dark/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-custom-gray p-6 min-h-[50vh] flex flex-col overflow-hidden`,
	form: /* CSS */ `space-y-4`,
	input:	/* CSS */ `mt-1 block w-full rounded-md border-custom-gray bg-black/20 text-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 placeholder-gray-400`,
	label:	/* CSS */ `block text-sm font-medium text-gray-300`,
};
