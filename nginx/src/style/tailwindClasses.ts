/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   tailwindClasses.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:41:14 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/16 17:28:16 by edelarbr         ###   ########.fr       */
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

		popupContainer: `relative bg-gray-800/95 border border-gray-600/30 rounded-lg shadow-xl select-none`,

		input: `w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:bg-gray-700/70 transition-all duration-200`,

		button: {
			primary: `w-full py-3 bg-gray-600/80 hover:bg-gray-600 text-gray-100 font-medium rounded-md transition-all duration-200 focus:outline-none focus:bg-gray-600`,
			close: `absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 text-xl font-light`,
		},

		title: `text-2xl font-medium text-gray-100 text-center font-family: SF Pro Display, system-ui, -apple-system, sans-serif`,

		form: `space-y-4`,

		message: `text-sm text-center mt-4 transition-opacity duration-200`,
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
				font: 'SF Pro Display, system-ui, -apple-system, sans-serif',
			}
		}
	}
};

// Classes CSS existantes pour compatibilité
export const COMMON_CLASSES = {
	primaryButton: /* CSS */ `bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-xl font-bold shadow-md transition duration-300`,
	secondaryButton:	/* CSS */ `inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`,
	pageContainer: /* CSS */ `container mx-auto p-4 h-[90vh] flex flex-col`,
	card: /* CSS */ `flex-1 bg-white rounded-lg shadow-md p-6 border border-gray-200 min-h-[50vh]`,
	form: /* CSS */ `space-y-4`,
	input:	/* CSS */ `mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500`,
	label:	/* CSS */ `block text-sm font-medium text-gray-700`,
};
