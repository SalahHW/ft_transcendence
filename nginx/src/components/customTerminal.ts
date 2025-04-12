export default class CustomTerminal {
    private _container: HTMLElement;
    private _outputElement!: HTMLElement; // Using definite assignment assertion
    private static _instance: CustomTerminal | null = null;
    private static _originalConsoleLog: (...data: any[]) => void;
    private _keydownHandler: (event: KeyboardEvent) => void;

    constructor(containerId: string) {
        this._container = document.getElementById(containerId) as HTMLElement;
        if (!this._container) {
            throw new Error(`Container with id ${containerId} not found`);
        }

        this._createTerminal();

        // Store the instance for global access
        CustomTerminal._instance = this;

        // Save the original console.log
        CustomTerminal._originalConsoleLog = console.log;

        // Override console.log
        console.log = (...data: any[]) => {
            // Call the original console.log
            CustomTerminal._originalConsoleLog.apply(console, data);

            // Log to our terminal
            if (CustomTerminal._instance) {
                const message = data.map(item =>
                    typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
                ).join(' ');

                CustomTerminal._instance.log(message);
            }
        };

        // Create keyboard event handler for Ctrl+L
        this._keydownHandler = (event: KeyboardEvent) => {
            // Check if Ctrl+L is pressed
            if (event.ctrlKey && event.key === 'l') {
                event.preventDefault(); // Prevent browser from handling this shortcut
                this.clear();
                console.log("Terminal cleared (Ctrl+L)");
            }
        };

        // Add global keyboard event listener
        document.addEventListener('keydown', this._keydownHandler);
    }

    // Method to restore the original console.log
    static restoreConsoleLog(): void {
        if (CustomTerminal._originalConsoleLog) {
            console.log = CustomTerminal._originalConsoleLog;
        }

        // Remove keyboard event listener if instance exists
        if (CustomTerminal._instance) {
            document.removeEventListener('keydown', CustomTerminal._instance._keydownHandler);
        }
    }

    private _createTerminal(): void {
        this._container.innerHTML = /* HTML */`
            <div class="custom-terminal flex flex-col h-full overflow-hidden rounded-lg bg-gray-900 text-gray-100">
                <div class="custom-terminal-header flex justify-between items-center px-3 py-2 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
                    <div class="flex items-center">
                        <span class="text-green-400 mr-2">❯</span>
                        <h3 class="m-0 font-mono font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">API Console</h3>
                    </div>

                    <div class="flex items-center space-x-2">
                        <button id="terminal-clear-btn" class="bg-gray-700 text-gray-300 border-0 rounded px-2 py-1 text-xs cursor-pointer hover:bg-gray-600 transition-colors">Clear (Ctrl+L)</button>
                    </div>
                </div>
                <div id="terminal-output" class="flex-1 p-3 overflow-y-auto font-mono text-sm leading-6"></div>
            </div>
        `;

        this._outputElement = document.getElementById('terminal-output') as HTMLElement;

        // Add event listener for clear button
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

        // Auto-scroll to bottom
        this._outputElement.scrollTop = this._outputElement.scrollHeight;
    }

    clear(): void {
        this._outputElement.innerHTML = '';
    }

    render(): void {
        // Just in case we need to re-render later
        this._createTerminal();
    }
}
