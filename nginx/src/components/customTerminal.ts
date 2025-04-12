export default class CustomTerminal {
    private _container: HTMLElement;
    private _outputElement!: HTMLElement; // Using definite assignment assertion
    private static _instance: CustomTerminal | null = null;
    private static _originalConsoleLog: (...data: any[]) => void;

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
    }

    // Method to restore the original console.log
    static restoreConsoleLog(): void {
        if (CustomTerminal._originalConsoleLog) {
            console.log = CustomTerminal._originalConsoleLog;
        }
    }

    private _createTerminal(): void {
        this._container.innerHTML = /* HTML */`
            <div class="custom-terminal flex flex-col h-full overflow-hidden rounded-lg bg-gray-900 text-gray-100">
                <div class="custom-terminal-header flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
                    <h3 class="custom-terminal-title m-0 text-base font-medium">Terminal</h3>
                    <button id="terminal-clear-btn" class="terminal-clear-btn bg-gray-700 text-white border-0 rounded px-2 py-1 text-sm cursor-pointer hover:bg-gray-600 transition-colors">Clear</button>
                </div>
                <div id="terminal-output" class="custom-terminal-output flex-1 p-3 overflow-y-auto font-mono text-sm leading-6"></div>
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
        line.className = 'terminal-line';
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
