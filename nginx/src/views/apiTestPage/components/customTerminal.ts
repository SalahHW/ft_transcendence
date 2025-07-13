import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class CustomTerminal {
	private _container!: HTMLElement;
	private _outputElement!: HTMLElement;
	private static _instance: CustomTerminal | null = null;
	private static _originalConsoleLog: (...data: any[]) => void;
	private static _originalConsoleError: (...data: any[]) => void;
	private static _originalConsoleWarn: (...data: any[]) => void;
	private static _isConsoleOverridden: boolean = false;
	private static _loggingInProgress: boolean = false;
	private _keydownHandler!: (event: KeyboardEvent) => void;

	constructor(containerId: string) {
		if (CustomTerminal._instance) {
			CustomTerminal._instance._updateContainer(containerId);
			return CustomTerminal._instance;
		}

		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container) {
			throw new Error(`Container with id ${containerId} not found`);
		}

		this._createTerminal();

		CustomTerminal._instance = this;

		if (!CustomTerminal._isConsoleOverridden) {
			this._overrideConsoleMethods();
		}

		this._keydownHandler = (event: KeyboardEvent) => {
			if (event.ctrlKey && event.key === 'l') {
				event.preventDefault();
				this.clear();
			}
		};

		document.addEventListener('keydown', this._keydownHandler);
	}

	private _updateContainer(containerId: string): void {
		const newContainer = document.getElementById(containerId) as HTMLElement;
		if (!newContainer) {
			throw new Error(`Container with id ${containerId} not found`);
		}

		this._container = newContainer;
		this._createTerminal();
	}

	private _overrideConsoleMethods(): void {
		CustomTerminal._originalConsoleLog = console.log;
		CustomTerminal._originalConsoleError = console.error;
		CustomTerminal._originalConsoleWarn = console.warn;

		console.log = (...data: any[]) => {
			if (CustomTerminal._loggingInProgress) {
				CustomTerminal._originalConsoleLog.apply(console, data);
				return;
			}

			CustomTerminal._loggingInProgress = true;
			try {
				CustomTerminal._originalConsoleLog.apply(console, data);

				if (CustomTerminal._instance) {
					const message = data.map(item =>
						typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
					).join(' ');

					CustomTerminal._instance.log(message);
				}
			} catch (error) {
				CustomTerminal._originalConsoleLog.apply(console, data);
			} finally {
				CustomTerminal._loggingInProgress = false;
			}
		};

		console.error = (...data: any[]) => {
			if (CustomTerminal._loggingInProgress) {
				CustomTerminal._originalConsoleError.apply(console, data);
				return;
			}

			CustomTerminal._loggingInProgress = true;
			try {
				CustomTerminal._originalConsoleError.apply(console, data);

				if (CustomTerminal._instance) {
					const message = data.map(item =>
						typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
					).join(' ');

					CustomTerminal._instance.logError(message);
				}
			} catch (error) {
				CustomTerminal._originalConsoleError.apply(console, data);
			} finally {
				CustomTerminal._loggingInProgress = false;
			}
		};

		console.warn = (...data: any[]) => {
			if (CustomTerminal._loggingInProgress) {
				CustomTerminal._originalConsoleWarn.apply(console, data);
				return;
			}

			CustomTerminal._loggingInProgress = true;
			try {
				CustomTerminal._originalConsoleWarn.apply(console, data);

				if (CustomTerminal._instance) {
					const message = data.map(item =>
						typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
					).join(' ');

					CustomTerminal._instance.logWarn(message);
				}
			} catch (error) {
				CustomTerminal._originalConsoleWarn.apply(console, data);
			} finally {
				CustomTerminal._loggingInProgress = false;
			}
		};

		CustomTerminal._isConsoleOverridden = true;
	}

	static restoreConsoleLog(): void {
		if (CustomTerminal._isConsoleOverridden) {
			if (CustomTerminal._originalConsoleLog) {
				console.log = CustomTerminal._originalConsoleLog;
			}
			if (CustomTerminal._originalConsoleError) {
				console.error = CustomTerminal._originalConsoleError;
			}
			if (CustomTerminal._originalConsoleWarn) {
				console.warn = CustomTerminal._originalConsoleWarn;
			}
			CustomTerminal._isConsoleOverridden = false;
		}

		if (CustomTerminal._instance) {
			document.removeEventListener('keydown', CustomTerminal._instance._keydownHandler);
			CustomTerminal._instance = null;
			CustomTerminal._instance = null;
		}
	}

	private _createTerminal(): void {
		this._container.innerHTML = /* HTML */`
			<div class="custom-terminal ${UI_THEME.components.terminal.container}">
				<div class="custom-terminal-header ${UI_THEME.components.terminal.header}">
					<div class="flex items-center">
						<span class="text-green-400 mr-2">❯</span>
						<h3 class="m-0 font-mono font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">API Console</h3>
					</div>

					<div class="flex items-center space-x-2">
						<button id="terminal-clear-btn" class="${UI_THEME.components.terminal.clearButton}">Clear (Ctrl+L)</button>
					</div>
				</div>
				<div id="terminal-output" class="${UI_THEME.components.terminal.output}"></div>
			</div>
		`;

		this._outputElement = document.getElementById('terminal-output') as HTMLElement;

		const clearButton = document.getElementById('terminal-clear-btn');
		if (clearButton) {
			clearButton.addEventListener('click', () => this.clear());
		}
	}

	log(message: string): void {
		const line = document.createElement('p');
		line.className = 'm-0 py-0.5 whitespace-pre-wrap break-words';
		line.textContent = message;
		this._outputElement.appendChild(line);

		this._outputElement.scrollTop = this._outputElement.scrollHeight;
	}

	/**
	 * Affiche une image dans le terminal custom.
	 * Bonne pratique : méthode dédiée, pas de mélange avec log().
	 */
	logImage(url: string, alt: string = "image"): void {
		const img = document.createElement('img');
		img.src = url;
		img.alt = alt;
		img.style.maxWidth = "100%";
		img.style.maxHeight = "200px";
		img.style.display = "block";
		img.style.margin = "8px 0";
		this._outputElement.appendChild(img);

		this._outputElement.scrollTop = this._outputElement.scrollHeight;
	}

	logError(message: string): void {
		const line = document.createElement('p');
		line.className = 'm-0 py-0.5 whitespace-pre-wrap break-words text-red-400';
		line.textContent = `${message}`;
		this._outputElement.appendChild(line);

		this._outputElement.scrollTop = this._outputElement.scrollHeight;
	}

	logWarn(message: string): void {
		const line = document.createElement('p');
		line.className = 'm-0 py-0.5 whitespace-pre-wrap break-words text-yellow-400';
		line.textContent = `${message}`;
		this._outputElement.appendChild(line);

		this._outputElement.scrollTop = this._outputElement.scrollHeight;
	}

	clear(): void {
		this._outputElement.innerHTML = '';
	}

	render(): void {
		this._createTerminal();
	}
}
