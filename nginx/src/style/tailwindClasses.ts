export const UI_THEME = {

	colors: {
		background: {
			primary: '#1F2937D9',
			primarySelected: '#374151F2',
			secondary: '#1F2937E6',
			overlay: 'bg-black/30 backdrop-blur-md',
			input: 'bg-gray-700/50',
			inputFocus: 'bg-gray-700/70',
		},
		border: {
			primary: '#4B55634D',
			primarySelected: '#9CA3AF99',
		},
		text: {
			primary: '#F3F4F6',
			secondary: '#9CA3AF',
			placeholder: 'text-gray-400',
		},
		green: {
			light: '#0DCB53',
			dark: '#258246'
		},
		red: {
			light: '#D40F17',
			dark: '#862427'
		}
	},

	animations: {
		entrance: 'opacity-0 scale-95 transition-all duration-150 ease-out',
		visible: 'opacity-100 scale-100',
		exit: 'opacity-0 scale-95',
		hover: 'transition-all duration-200',
	},

	components: {
		overlay: `fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-xl select-none opacity-0 scale-95 transition-all duration-150 ease-out`,

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
		},
		friendList: {
			addFriendContainer: `flex items-center gap-2 mt-2`,
			addFriendInput: `flex-1 bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:bg-black/30 transition-all duration-200 p-2 text-white placeholder-gray-400`,
			addFriendButton: `w-16 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200`,
			addFriendButtonCollapsed: `w-16 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200`
		},
		text: {
			font: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
		}
	},

	wheel: {
		svg: {
			fill: {
				normal: '#313131',
				selected: '#444444',
				hover: '#444444',
				center: '#313131',
			},
			stroke: {
				normal: '#5A5A5A',
				selected: '#888888',
			},
			text: {
				normal: '#9CA3AF',
				selected: '#F3F4F6',
				font: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
			}
		}
	}
};

export const COMMON_CLASSES = {
	primaryButton: /* CSS */ `px-6 py-3 bg-white/10 hover:bg-white/20 text-gray-100 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg`,
	secondaryButton:	/* CSS */ `px-4 py-2 bg-transparent hover:bg-white/10 border border-white/20 text-gray-300 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30`,
	pageContainer: /* CSS */ `container mx-auto p-4 h-[90vh] flex flex-col`,
	card: /* CSS */ `flex-1 bg-custom-dark/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-custom-gray p-6 min-h-[50vh] flex flex-col overflow-hidden`,
	form: /* CSS */ `space-y-4`,
	input:	/* CSS */ `mt-1 block w-full rounded-md border-custom-gray bg-black/20 text-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 placeholder-gray-400`,
	label:	/* CSS */ `block text-sm font-medium text-gray-300`,
};
