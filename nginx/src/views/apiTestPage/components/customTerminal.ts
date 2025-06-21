/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   customTerminal.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:23 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/22 12:00:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class CustomTerminal {
    private _container: HTMLElement;
    private _outputElement!: HTMLElement;
    private static _instance: CustomTerminal | null = null;
    private static _originalConsoleLog: (...data: any[]) => void;
    private static _originalConsoleError: (...data: any[]) => void;
    private static _originalConsoleWarn: (...data: any[]) => void;
    private static _isConsoleOverridden: boolean = false;
    private _keydownHandler: (event: KeyboardEvent) => void;

    constructor(containerId: string) {
        // If there's already an instance, just update its container and return
        if (CustomTerminal._instance) {
            CustomTerminal._instance._updateContainer(containerId);
            return CustomTerminal._instance;
        }

        this._container = document.getElementById(containerId) as HTMLElement;
        if (!this._container) {
            throw new Error(`Container with id ${containerId} not found`);
        }

        this._createTerminal();

        // Store the instance for global access
        CustomTerminal._instance = this;

        // Only override console methods if not already done
        if (!CustomTerminal._isConsoleOverridden) {
            this._overrideConsoleMethods();
        }

        // Create keyboard event handler for Ctrl+L
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
        // Save the original console methods
        CustomTerminal._originalConsoleLog = console.log;
        CustomTerminal._originalConsoleError = console.error;
        CustomTerminal._originalConsoleWarn = console.warn;

        // Override console methods
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

        console.error = (...data: any[]) => {
            // Call the original console.error
            CustomTerminal._originalConsoleError.apply(console, data);

            // Log to our terminal with error styling
            if (CustomTerminal._instance) {
                const message = data.map(item =>
                    typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
                ).join(' ');

                CustomTerminal._instance.logError(message);
            }
        };

        console.warn = (...data: any[]) => {
            // Call the original console.warn
            CustomTerminal._originalConsoleWarn.apply(console, data);

            // Log to our terminal with warning styling
            if (CustomTerminal._instance) {
                const message = data.map(item =>
                    typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
                ).join(' ');

                CustomTerminal._instance.logWarn(message);
            }
        };

        CustomTerminal._isConsoleOverridden = true;
    }

    // Method to restore the original console methods
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

        // Remove keyboard event listener if instance exists
        if (CustomTerminal._instance) {
            document.removeEventListener('keydown', CustomTerminal._instance._keydownHandler);
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

    logError(message: string): void {
        const line = document.createElement('p');
        line.className = 'm-0 py-0.5 whitespace-pre-wrap break-words text-red-400';
        line.textContent = `❌ ${message}`;
        this._outputElement.appendChild(line);

        // Auto-scroll to bottom
        this._outputElement.scrollTop = this._outputElement.scrollHeight;
    }

    logWarn(message: string): void {
        const line = document.createElement('p');
        line.className = 'm-0 py-0.5 whitespace-pre-wrap break-words text-yellow-400';
        line.textContent = `⚠️ ${message}`;
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
