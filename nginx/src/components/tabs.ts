export default class Tabs {
	private _container: HTMLElement;
	private _tabs: HTMLElement[] = [];
	private _contents: HTMLElement[] = [];
	private _activeIndex: number = 0;

	// Tailwind classes for better readability
	private static readonly STYLES = {
		container:	`w-full`,
		tabsContainer:	`flex`,
		contentContainer:	`relative rounded-b-lg rounded-tr-lg border border-gray-200 bg-white shadow-sm`,

		// Styles for tabs
		activeTab:	`relative z-10 bg-white text-indigo-600 px-6 py-3 cursor-pointer font-medium text-sm leading-5
					rounded-t-lg border-t border-l border-r border-gray-200 border-b-0 font-semibold
					focus:outline-none`,
		inactiveTab:	`relative bg-gray-50 text-gray-600 px-6 py-2 cursor-pointer font-medium text-sm leading-5
						rounded-t-lg border-t border-l border-r border-gray-200 border-b-1
						focus:outline-none hover:bg-gray-100 transition-colors`,

		// Styles for content
		visibleContent:	`block p-6`,
		hiddenContent:	`hidden p-6`
	};

	/**
	 * Create a new tabs component
	 * @param containerId ID of the HTML element that will contain the tabs
	 * @param tabTitles Array of tab titles
	 */
	constructor(containerId: string, tabTitles: string[]) {
		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container) {
			throw new Error(`Container with id ${containerId} not found`);
		}
		this._render(tabTitles);
	}

	/**
	 * Render the tabs component in the container
	 * @param tabTitles Array of tab titles
	 */
	private _render(tabTitles: string[]): void {
		// Create the base structure
		this._createBaseStructure();

		// Get the containers for the tabs and the content
		const tabHeadersContainer = document.getElementById('tab-headers') as HTMLElement;
		const tabContentsContainer = document.getElementById('tab-contents') as HTMLElement;

		// Create the tabs and the content containers
		tabTitles.forEach((title, index) => {
			// Create the tab elements
			this._createTabElement(title, index, tabHeadersContainer);

			// Create the content containers
			this._createContentElement(index, tabContentsContainer);
		});
	}

	/**
	 * Create the base HTML structure for the tabs
	 */
	private _createBaseStructure(): void {
		this._container.innerHTML = /* HTML */ `
			<div class="${Tabs.STYLES.container}">
				<!-- Container for tabs -->
				<div class="${Tabs.STYLES.tabsContainer}">
					<div id="tab-headers" class="flex"></div>
				</div>
				<!-- Content container - visually integrated with the active tab -->
				<div id="tab-contents" class="${Tabs.STYLES.contentContainer}" style="margin-top: -1px;"></div>
			</div>
		`;
	}

	/**
	 * Create a tab element
	 * @param title Tab title
	 * @param index Tab index
	 * @param container Container for the tab
	 */
	private _createTabElement(title: string, index: number, container: HTMLElement): void {
		const tab = document.createElement('div');

		// Apply the appropriate styles based on the state (active/inactive)
		tab.className = index === this._activeIndex
			? Tabs.STYLES.activeTab
			: Tabs.STYLES.inactiveTab;

		tab.textContent = title;
		tab.dataset.index = index.toString();
		tab.addEventListener('click', () => this._activateTab(index));

		this._tabs.push(tab);
		container.appendChild(tab);
	}

	/**
	 * Create a content element for a tab
	 * @param index Tab index
	 * @param container Container for the content
	 */
	private _createContentElement(index: number, container: HTMLElement): void {
		const content = document.createElement('div');
		content.className = index === this._activeIndex
			? Tabs.STYLES.visibleContent
			: Tabs.STYLES.hiddenContent;
		content.dataset.index = index.toString();

		this._contents.push(content);
		container.appendChild(content);
	}

	/**
	 * Activate a specific tab
	 * @param index Index of the tab to activate
	 */
	private _activateTab(index: number): void {
		if (index === this._activeIndex) return;

		// Deactivate the currently active tab
		this._deactivateTab(this._activeIndex);

		// Activate the new tab
		this._tabs[index].className = Tabs.STYLES.activeTab;
		this._contents[index].className = Tabs.STYLES.visibleContent;

		// Update the active index
		this._activeIndex = index;
	}

	/**
	 * Deactivate a specific tab
	 * @param index Index of the tab to deactivate
	 */
	private _deactivateTab(index: number): void {
		this._tabs[index].className = Tabs.STYLES.inactiveTab;
		this._contents[index].className = Tabs.STYLES.hiddenContent;
	}

	/**
	 * Set the content of a specific tab
	 * @param index Index of the tab
	 * @param contentElement Content to add (HTML string or DOM element)
	 */
	setTabContent(index: number, contentElement: HTMLElement | string): void {
		if (index < 0 || index >= this._contents.length) {
			throw new Error(`Tab index ${index} is out of range`);
		}

		if (typeof contentElement === 'string') {
			this._contents[index].innerHTML = contentElement;
		} else {
			this._contents[index].innerHTML = '';
			this._contents[index].appendChild(contentElement);
		}
	}

	/**
	 * Get the content container of a specific tab
	 * @param index Index of the tab
	 * @returns HTML element containing the tab content
	 */
	getTabContentContainer(index: number): HTMLElement {
		if (index < 0 || index >= this._contents.length) {
			throw new Error(`Tab index ${index} is out of range`);
		}
		return this._contents[index];
	}
}
