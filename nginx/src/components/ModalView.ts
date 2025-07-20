export interface ModalViewOptions {
    width?: string;
    height?: string;
    maxWidth?: string;
    contentContainerClasses?: string;
}

export default class ModalView {
    protected _element: HTMLElement;
    protected _contentContainer: HTMLElement;
    public _isVisible: boolean = false;
    private static _instances: Set<ModalView> = new Set();

    constructor(options?: ModalViewOptions) {
        const container = document.createElement('div');
        document.body.appendChild(container);
        this._element = container;

        this._renderBase(options);
        this._contentContainer = this._element.querySelector('.modal-content-container') as HTMLElement;
        this._setupEventListeners();
        ModalView._instances.add(this);
    }

    private _renderBase(options?: ModalViewOptions): void {
        this._element.className = `
			fixed inset-0 z-40 hidden items-center justify-center
			select-none opacity-0 scale-95 transition-all duration-150 ease-out
		`;

        const width = options?.width || 'auto';
        const height = options?.height || 'auto';
        const maxWidth = options?.maxWidth || 'none';
        const contentClasses = options?.contentContainerClasses || '';

        this._element.innerHTML = /* HTML */`
			<div class="modal-content-container bg-[#313131]/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-[#5A5A5A] ${contentClasses}"
                 style="width: ${width}; height: ${height}; max-width: ${maxWidth};">
			</div>
		`;
    }

    private _setupEventListeners(): void {
		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Escape" && this._isVisible) {
				const activeElement = document.activeElement as HTMLElement;
				const isInInputField = activeElement && (
					activeElement.tagName === 'INPUT' ||
					activeElement.tagName === 'TEXTAREA' ||
					activeElement.isContentEditable
				);

				if (!isInInputField) {
					event.preventDefault();
					window.history.back();
				}
			}
		});

		this._element.addEventListener('click', (e) => {
			if (e.target === this._element) {
				window.history.back();
			}
		});
	}

    public show(): void {
		if (this._isVisible) return;
		this._isVisible = true;

		this._element.classList.remove("hidden");
		this._element.classList.add("flex");

		requestAnimationFrame(() => {
			this._element.classList.add("opacity-100", "scale-100");
			this._element.classList.remove("opacity-0", "scale-95");
		});
	}

	public hide(shouldNavigateBack: boolean = true): void {
		if (shouldNavigateBack) {
			window.history.back();
			return;
		}

		if (!this._isVisible) return;
		this._isVisible = false;

		this._element.classList.add("opacity-0", "scale-95");
		this._element.classList.remove("opacity-100", "scale-100");

		setTimeout(() => {
			this._element.classList.add("hidden");
			this._element.classList.remove("flex");
		}, 150);
	}

    public cleanup(): void {
        this.hide(false);
    }

    public destroy(): void {
        this._element.remove();
        ModalView._instances.delete(this);
    }
}
