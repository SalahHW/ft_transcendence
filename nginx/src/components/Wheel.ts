import Router from "../router/Router.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import AuthService from "../services/AuthNanoService.js";
import ModalView from "./ModalView.js";

interface Option {
  label: string;
  onClick?: () => void | Promise<void>;
  subMenu?: Option[];
  icon?: string;
  condition?: () => boolean;
}

/*
	TODO: À l'ouverture d'une page, les autres pages doivent se fermer
*	IDEA: Avoir un point qui suit la souris.
*	maintenir right-click, le point s'agrandit et affiche les options.
*/

export default class Wheel {
  private _element: HTMLElement;
  private _optionHistory: Option[][] = [];
  private _selectedIndex: number = 0;
  private _isVisible: boolean = false;
  private _userIsLoggedIn: boolean = false;
  private _router: Router = Router.getInstance();
  private _authService: AuthService = AuthService.getInstance();
  private _baseWheelOptions: Option[] = [
    {
      label: "API Test page",
      icon: "🔧",
      onClick: () => {
        this._router.navigate("/api-test");
      },
    },
    {
      label: "Profile",
      icon: "👤",
      onClick: () => {
        this._router.navigate("/profile");
      },
      condition: () => this._userIsLoggedIn,
    },
    {
      label: "Play",
      icon: "🎮",
      condition: () => this._userIsLoggedIn,
      subMenu: [
        {
          label: "1v1",
          icon: "⚔️",
          onClick: () => {
            this._router.navigate("/1v1");
          },
        },
        {
          label: "Tournament",
          icon: "🏆",
          onClick: () => {
            this._router.navigate("/tournament");
          },
        },
      ],
    },
    {
      label: "Login",
      icon: "🔑",
      condition: () => !this._userIsLoggedIn,
      subMenu: [
        {
          label: "Sign In",
          icon: "→",
          onClick: () => {
            this._router.navigate("/login");
          },
        },
        {
          label: "Register",
          icon: "+",
          onClick: () => {
            this._router.navigate("/register");
          },
        },
        {
          label: "Wallet Register",
          icon: "🦊",
          onClick: () => {
            this._router.navigate("/wallet-register");
          },
        },
        {
          label: "Wallet Login",
          icon: "🔐",
          onClick: async () => {
            try {
              await this._authService.loginWithWallet();
            } catch (error) {
              console.error("Wallet Login failed:", error);
            }
          },
        },
      ],
    },
    {
      label: "Logout",
      icon: "🚪",
      onClick: async () => {
        try {
          await this._authService.logout();
          this._router.navigate("/");
        } catch (error) {
          console.error("Logout failed:", error);
        }
      },
      condition: () => this._userIsLoggedIn,
    },
  ];
  private _wheelOptions: Option[] = [];

	constructor(elementId: string) {
		this._element = document.getElementById(elementId)!;
		if (!this._element) {
			throw new Error(`Element with id ${elementId} not found`);
		}

    this._setupKeyboardEvents();
    this._setupMouseEvents();

    this.render();
  }

		private _setupKeyboardEvents(): void {
		document.addEventListener("keydown", async (event: KeyboardEvent) => {
			if (event.key === 'Shift') {
				const target = event.target as HTMLElement;

				if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
					return;
				}

				if (this._isVisible) {
					return;
				}

				// Empêcher l'affichage de la wheel sur les pages de jeu
				const currentPath = this._router.getCurrentPath();
				if (currentPath.includes('/tournament') || currentPath.includes('/1v1')) {
					return;
				}

				event.preventDefault();
				await this.showWheel();
			}
		});

		document.addEventListener("keyup", (event: KeyboardEvent) => {
			if (event.key === 'Shift') {
				this.hideWheel();
			}
		});
	}

  private _setupMouseEvents(): void {
    this._element.addEventListener("click", (event: MouseEvent) => {
      event.stopPropagation();
    });
  }

  private _closeAllModals(): void {
    ModalView.hideAll();
  }

  private async _selectOption(): Promise<void> {
    const selectedOption = this._wheelOptions[this._selectedIndex];
    if (!selectedOption) return;

    if (selectedOption.subMenu && selectedOption.subMenu.length > 0) {
      this._optionHistory.push(this._wheelOptions);
      this._wheelOptions = selectedOption.subMenu;
      this._selectedIndex = 0;
      this._renderWheel();
    } else if (selectedOption.onClick) {
      this._closeAllModals();
      await selectedOption.onClick();
      this.hideWheel();
    }
  }

  private _goBack(): void {
    if (this._optionHistory.length > 0) {
      this._wheelOptions = this._optionHistory.pop()!;
      this._selectedIndex = 0;
      this._renderWheel();
    } else {
      this.hideWheel();
    }
  }

  private _updateSelection(): void {
    this._renderWheel();
  }

    public async showWheel(): Promise<void> {
    if (this._isVisible) {
      return;
    }

    try {
      this._userIsLoggedIn = await this._authService.isLoggedIn(true);

      this._isVisible = true;
      this._selectedIndex = 0;
      this._wheelOptions = this._baseWheelOptions.filter(
        (option) => option.condition === undefined || option.condition()
      );
      this._optionHistory = [];

      this._element.classList.remove("hidden");
      this._element.classList.add("flex");
      this._renderWheel();

      requestAnimationFrame(() => {
        this._element.classList.add("opacity-100", "scale-100");
        this._element.classList.remove("opacity-0", "scale-95");
      });
    } catch (error) {
      console.error(`[Wheel] Error in showWheel():`, error);
    }
  }

  public hideWheel(): void {
    if (!this._isVisible) {
      return;
    }

    this._isVisible = false;

    this._element.classList.add("opacity-0", "scale-95");
    this._element.classList.remove("opacity-100", "scale-100");

    setTimeout(() => {
      this._element.classList.add("hidden");
      this._element.classList.remove("flex");
    }, 150);
  }

  public render(): void {
    this._element.className = UI_THEME.components.overlay;

    this._element.innerHTML = `
			<div class="wheel-content-wrapper">
        <svg class="wheel-svg select-none" width="500" height="500" viewBox="0 0 500 500" style="user-select: none; -webkit-user-select: none; -moz-user-select: none;">
        </svg>
			</div>
    `;
  }

	private _renderWheel(): void {
		const svg = this._element.querySelector(".wheel-svg") as SVGElement;
		if (!svg) return;

    const centerX = 250;
    const centerY = 250;
    const radius = 250;
    const innerRadius = radius * 0.20;
    const optionCount = this._wheelOptions.length;

		svg.innerHTML = "";

    if (optionCount === 0) return;

    const angleStep = (2 * Math.PI) / optionCount;
    const startAngle = -Math.PI / 2;

		const centerCircle = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle"
		);
		centerCircle.setAttribute("cx", centerX.toString());
		centerCircle.setAttribute("cy", centerY.toString());
		centerCircle.setAttribute("r", innerRadius.toString());
		centerCircle.setAttribute("fill", UI_THEME.wheel.svg.fill.center);
		centerCircle.setAttribute("stroke", UI_THEME.wheel.svg.stroke.normal);
		centerCircle.setAttribute("stroke-width", "2");
		centerCircle.setAttribute(
			"class",
			"cursor-pointer transition-all duration-200"
		);

		centerCircle.addEventListener("click", () => {
			this._goBack();
		});

    svg.appendChild(centerCircle);

    this._wheelOptions.forEach((option, index) => {
      const angle1 = startAngle + index * angleStep;
      const angle2 = startAngle + (index + 1) * angleStep;

      const isSelected = index === this._selectedIndex;

      const x1 = centerX + Math.cos(angle1) * innerRadius;
      const y1 = centerY + Math.sin(angle1) * innerRadius;
      const x2 = centerX + Math.cos(angle1) * radius;
      const y2 = centerY + Math.sin(angle1) * radius;
      const x3 = centerX + Math.cos(angle2) * radius;
      const y3 = centerY + Math.sin(angle2) * radius;
      const x4 = centerX + Math.cos(angle2) * innerRadius;
      const y4 = centerY + Math.sin(angle2) * innerRadius;

			const path = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path"
			);
			const largeArcFlag = angleStep > Math.PI ? 1 : 0;

			const pathData = [
				`M ${x1} ${y1}`,
				`L ${x2} ${y2}`,
				`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
				`L ${x4} ${y4}`,
				`A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
				"Z",
			].join(" ");

			path.setAttribute("d", pathData);
			path.setAttribute(
				"fill",
				isSelected
					? UI_THEME.wheel.svg.fill.selected
					: UI_THEME.wheel.svg.fill.normal
			);
			path.setAttribute(
				"stroke",
				isSelected
					? UI_THEME.wheel.svg.stroke.selected
					: UI_THEME.wheel.svg.stroke.normal
			);
			path.setAttribute("stroke-width", "2");
			path.setAttribute(
				"class",
				"cursor-pointer transition-all duration-200"
			);

			path.addEventListener("click", async () => {
				this._selectedIndex = index;
				await this._selectOption();
			});

			path.addEventListener("mouseenter", () => {
				if (!isSelected) {
					this._selectedIndex = index;
					this._updateSelection();
				}
			});

      svg.appendChild(path);

      const textAngle = angle1 + angleStep / 2;
      const textRadius = (radius + innerRadius) / 2;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

			const textGroup = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"g"
			);
			textGroup.setAttribute("class", "pointer-events-none");
			textGroup.style.userSelect = "none";
			textGroup.style.webkitUserSelect = "none";
			(textGroup.style as any).MozUserSelect = "none";

			if (option.icon) {
				const iconText = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"text"
				);
				iconText.setAttribute("x", textX.toString());
				iconText.setAttribute("y", (textY - 12).toString());
				iconText.setAttribute("text-anchor", "middle");
				iconText.setAttribute("dominant-baseline", "middle");
				iconText.setAttribute(
					"fill",
					isSelected
						? UI_THEME.wheel.svg.text.selected
						: UI_THEME.wheel.svg.text.normal
				);
				iconText.setAttribute("font-size", "24");
				iconText.setAttribute("font-family", UI_THEME.wheel.svg.text.font);
				iconText.setAttribute("font-weight", "300");
				iconText.textContent = option.icon;
				textGroup.appendChild(iconText);
			}

			const label = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"text"
			);
			label.setAttribute("x", textX.toString());
			label.setAttribute("y", (textY + (option.icon ? 12 : 0)).toString());
			label.setAttribute("text-anchor", "middle");
			label.setAttribute("dominant-baseline", "middle");
			label.setAttribute(
				"fill",
				isSelected
					? UI_THEME.wheel.svg.text.selected
					: UI_THEME.wheel.svg.text.normal
			);
			label.setAttribute("font-size", "16");
			label.setAttribute("font-weight", isSelected ? "500" : "400");
			label.setAttribute("font-family", UI_THEME.wheel.svg.text.font);
			label.textContent = option.label;
			textGroup.appendChild(label);

      svg.appendChild(textGroup);
    });

		if (this._optionHistory.length > 0) {
			const backIndicator = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"text"
			);
			backIndicator.setAttribute("x", centerX.toString());
			backIndicator.setAttribute("y", centerY.toString());
			backIndicator.setAttribute("text-anchor", "middle");
			backIndicator.setAttribute("dominant-baseline", "middle");
			backIndicator.setAttribute("fill", UI_THEME.colors.text.secondary);
			backIndicator.setAttribute("font-size", "16");
			backIndicator.setAttribute(
				"font-family",
				"SF Pro Display, system-ui, -apple-system, sans-serif"
			);
			backIndicator.setAttribute("font-weight", "400");
			backIndicator.textContent = "←";
			svg.appendChild(backIndicator);
		}
	}
}
