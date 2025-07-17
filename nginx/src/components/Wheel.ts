import Router from "../router/Router.js";
import { UI_THEME } from "../style/tailwindClasses.js";
import AuthService from "../services/AuthNanoService.js";
import ModalView from "./ModalView.js";

interface Option {
  label?: string;
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
    /*   label: "API Test page", */
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="currentColor" stroke-width="2" d="M9 1v7L2 20v3h20v-3L15 8V1m0 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm-6 2a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm9-7c-7-3-6 4-12 1M6 1h12"/></svg>`,
      onClick: () => {
        this._router.navigate("/api-test");
      },
    },
    {
      /* label: "Profile", */
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linejoin="round" d="M4 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="7" r="3"/></g></svg>`,
      onClick: () => {
        this._router.navigate("/profile");
      },
      condition: () => this._userIsLoggedIn,
    },
    {
      /* label: "Play", */
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.031 3.887H7.97a5.22 5.22 0 0 0-5.219 5.22v8.265c0 2.075 2.533 3.085 3.962 1.581l2.976-3.134h4.624l2.875 3.46c1.374 1.654 4.063.682 4.063-1.467V9.106a5.22 5.22 0 0 0-5.219-5.219M8.138 8.39v4m-2-2h4"/><circle cx="14.662" cy="9.39" r="1" fill="currentColor"/><circle cx="16.862" cy="11.59" r="1" fill="currentColor"/></g></svg>`,
      condition: () => this._userIsLoggedIn,
      subMenu: [
        {
          /* label: "1v1", */
          icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7.987 9.492L5.678 7.514C4.155 6.204 4.15 4.302 3.988 3.02c1.666.08 2.956.23 4.08 1.18l1.176 1.336l1.273 1.428m8.941 11.455l-2.964-3m-2.471 3c.022-.272.2-.978 1.019-1.734c.734-.679 2.327-2.305 3.042-3.01c.406-.4 1.07-.68 1.374-.679m-3.889-.187l1.337 1.479m-3.229.15l1.495 1.313m5.29 2.23c.83.002 1.54.615 1.538 1.445c-.001.83-.707 1.557-1.538 1.556c-.83-.002-1.47-.732-1.469-1.562c.054-.826.665-1.328 1.47-1.439m-15.867.412l2.958-2.892m-2.992-2.514c.273.022 1.032.204 1.712 1.054c.625.78 2.31 2.29 3.017 3.004c.4.404.68 1.044.68 1.348M7.266 14.23l8.239-9.566c1.34-1.496 3.214-1.528 4.5-1.666c-.112 1.664-.288 2.95-1.26 4.055L8.55 15.927m-3.543 3.572a1.503 1.503 0 1 1-3.006 0a1.503 1.503 0 0 1 3.006 0"/></svg>`,
          onClick: () => {
            this._router.navigate("/1v1");
          },
        },
        {
          /* label: "Tournament", */
          icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M11.014 4.8c.172-.225.484-.55.986-.55s.814.325.986.55c.165.214.33.511.5.816l.121.218l.057.1l.099.023l.238.054c.327.074.653.147.903.246c.276.109.65.32.795.785c.142.455-.037.841-.193 1.09c-.145.23-.365.486-.59.749l-.16.188l-.082.097c.002.036.007.078.012.135l.024.25c.034.351.067.691.055.963c-.012.286-.08.718-.468 1.011c-.4.304-.84.238-1.12.157c-.258-.073-.563-.214-.87-.355l-.222-.103l-.085-.039l-.085.04l-.223.102c-.306.141-.611.282-.869.355c-.28.08-.72.147-1.12-.157c-.387-.293-.456-.725-.468-1.01c-.012-.273.02-.613.055-.965l.024-.25l.013-.134l-.083-.097l-.16-.188c-.225-.263-.445-.52-.59-.75c-.156-.248-.335-.634-.193-1.09c.144-.463.519-.675.795-.784c.25-.099.576-.172.903-.246l.238-.054l.1-.023l.056-.1l.121-.218c.17-.305.335-.602.5-.816M12 6.034q-.086.15-.199.354l-.098.176l-.023.04c-.078.144-.208.382-.425.547c-.221.168-.488.226-.643.26l-.044.009l-.19.043c-.176.04-.319.072-.44.103c.079.097.182.219.316.376l.13.152l.03.034c.108.125.282.325.363.585c.08.256.052.52.035.686l-.005.047l-.02.203a25 25 0 0 0-.042.46c.105-.046.223-.1.364-.165l.179-.082l.04-.02c.144-.067.393-.185.672-.185s.528.118.672.186l.04.019l.179.082q.209.097.364.165a25 25 0 0 0-.042-.46l-.02-.203l-.005-.047c-.017-.167-.045-.43.035-.686c.08-.26.255-.46.363-.585l.03-.034l.13-.152c.134-.157.237-.279.316-.376c-.121-.03-.264-.063-.44-.103l-.19-.043l-.044-.01c-.155-.033-.422-.091-.643-.26c-.217-.164-.347-.402-.425-.545l-.023-.041l-.098-.176q-.112-.204-.199-.354m-1.26 4.478l-.001-.004zm2.52 0l.001-.004z"/><path d="M7.498 1.607A27 27 0 0 1 12 1.25c1.828 0 3.339.161 4.502.357l.135.023c1.01.169 1.85.31 2.506 1.118c.421.519.557 1.08.588 1.705l.492.164c.463.154.87.29 1.191.44c.348.162.667.37.911.709s.341.707.385 1.088c.04.353.04.78.04 1.27v.144c0 .402 0 .757-.03 1.054c-.032.321-.103.634-.28.936c-.179.303-.418.517-.683.701c-.245.17-.555.343-.907.538l-2.64 1.467c-.54 1.061-1.28 2.007-2.3 2.69c-.875.587-1.922.959-3.16 1.065v2.031h1.43a1.75 1.75 0 0 1 1.716 1.407l.219 1.093H18a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5h1.885l.219-1.093A1.75 1.75 0 0 1 9.82 18.75h1.43v-2.031c-1.238-.106-2.285-.478-3.16-1.064c-1.019-.684-1.76-1.63-2.3-2.691l-2.64-1.467a11 11 0 0 1-.907-.538a2.2 2.2 0 0 1-.682-.7a2.2 2.2 0 0 1-.281-.937c-.03-.297-.03-.652-.03-1.054v-.145c0-.488 0-.916.04-1.269c.044-.381.14-.75.385-1.088c.244-.339.563-.547.91-.71c.323-.15.729-.285 1.192-.439l.492-.164c.031-.626.167-1.186.588-1.705c.657-.809 1.496-.95 2.507-1.118zM9.415 21.25h5.17l-.16-.799a.25.25 0 0 0-.245-.201H9.82a.25.25 0 0 0-.245.201zM4.302 6.023l-.014.005c-.51.17-.834.28-1.07.389c-.217.1-.287.171-.326.226s-.084.143-.111.381c-.03.258-.031.6-.031 1.138v.073c0 .445 0 .724.022.938c.02.196.052.275.082.325c.029.05.082.116.244.229c.176.122.42.258.81.475l1.065.592c-.428-1.57-.6-3.25-.67-4.77m14.725 4.77c.428-1.57.6-3.25.671-4.77l.014.005c.51.17.834.28 1.07.389c.217.1.287.171.326.226s.084.143.111.381c.03.258.031.6.031 1.138v.073c0 .445 0 .724-.022.938c-.02.196-.052.275-.082.325c-.029.05-.082.116-.244.229c-.177.122-.42.258-.81.475zM12 2.75c-1.74 0-3.167.153-4.252.336c-1.207.204-1.46.28-1.726.608c-.262.322-.287.628-.234 1.983c.09 2.258.388 4.696 1.31 6.55c.456.914 1.052 1.662 1.828 2.182c.77.517 1.765.841 3.074.841c1.31 0 2.304-.324 3.075-.841c.776-.52 1.371-1.268 1.826-2.183c.923-1.853 1.221-4.29 1.31-6.55c.055-1.354.03-1.66-.232-1.982c-.266-.328-.52-.404-1.727-.608A25.6 25.6 0 0 0 12 2.75"/></g></svg>`,
          onClick: () => {
            this._router.navigate("/tournament");
          },
        },
      ],
    },
    {
      /* label: "Register", */
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 20q-.213 0-.357-.144T11.5 19.5v-7h-7q-.213 0-.356-.144T4 11.999t.144-.356t.356-.143h7v-7q0-.213.144-.356T12.001 4t.356.144t.143.356v7h7q.213 0 .356.144t.144.357t-.144.356t-.356.143h-7v7q0 .213-.144-.356t-.357-.144"/></svg>`,
      condition: () => !this._userIsLoggedIn,
      subMenu: [
        {
          /* label: "Email", */
          icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18.5" height="17" x="2.682" y="3.5" rx="4"/><path stroke-linecap="round" stroke-linejoin="round" d="m2.729 7.59l7.205 4.13a3.96 3.96 0 0 0 3.975 0l7.225-4.13"/></g></svg>`,
          onClick: () => {
            this._router.navigate("/register");
          },
        },
        {
          /* label: "Wallet", */
          icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8h4"/><path stroke-width="1.5" d="M20.833 9h-2.602C16.446 9 15 10.343 15 12s1.447 3 3.23 3h2.603c.084 0 .125 0 .16-.002c.54-.033.97-.432 1.005-.933c.002-.032.002-.071.002-.148v-3.834c0-.077 0-.116-.002-.148c-.036-.501-.465-.9-1.005-.933C20.959 9 20.918 9 20.834 9Z"/><path stroke-width="1.5" d="M20.965 9c-.078-1.872-.328-3.02-1.137-3.828C18.657 4 16.771 4 13 4h-3C6.229 4 4.343 4 3.172 5.172S2 8.229 2 12s0 5.657 1.172 6.828S6.229 20 10 20h3c3.771 0 5.657 0 6.828-1.172c.809-.808 1.06-1.956 1.137-3.828"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.991 12h.01"/></g></svg>`,
          onClick: () => {
            this._router.navigate("/wallet-register");
          },
        },
      ],
    },
    {
      /* label: "Login", */
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12.48 20q-.213 0-.356-.143t-.143-.357t.143-.357t.357-.143h5.904q.23 0 .423-.192t.192-.424V5.616q0-.231-.192-.424T18.384 5h-5.903q-.214 0-.357-.143t-.143-.357t.143-.357t.357-.143h5.904q.69 0 1.153.463T20 5.616v12.769q0 .69-.462 1.153T18.384 20zm.407-7.5H4.518q-.213 0-.356-.143T4.019 12t.144-.357t.356-.143h8.368l-1.968-1.971q-.14-.14-.15-.338q-.009-.199.15-.364t.352-.168t.358.162l2.613 2.613q.243.243.243.566t-.243.566l-2.613 2.613q-.146.146-.347.153t-.367-.159q-.16-.165-.156-.357q.003-.191.162-.35z"/></svg>`,
      condition: () => !this._userIsLoggedIn,
      subMenu: [
        {
          /* label: "Email", */
          icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18.5" height="17" x="2.682" y="3.5" rx="4"/><path stroke-linecap="round" stroke-linejoin="round" d="m2.729 7.59l7.205 4.13a3.96 3.96 0 0 0 3.975 0l7.225-4.13"/></g></svg>`,
          onClick: () => {
            this._router.navigate("/login");
          },
        },
        {
          /* label: "Wallet", */
          icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8h4"/><path stroke-width="1.5" d="M20.833 9h-2.602C16.446 9 15 10.343 15 12s1.447 3 3.23 3h2.603c.084 0 .125 0 .16-.002c.54-.033.97-.432 1.005-.933c.002-.032.002-.071.002-.148v-3.834c0-.077 0-.116-.002-.148c-.036-.501-.465-.9-1.005-.933C20.959 9 20.918 9 20.834 9Z"/><path stroke-width="1.5" d="M20.965 9c-.078-1.872-.328-3.02-1.137-3.828C18.657 4 16.771 4 13 4h-3C6.229 4 4.343 4 3.172 5.172S2 8.229 2 12s0 5.657 1.172 6.828S6.229 20 10 20h3c3.771 0 5.657 0 6.828-1.172c.809-.808 1.06-1.956 1.137-3.828"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.991 12h.01"/></g></svg>`,
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
      /* label: "Logout", */
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M5.616 20q-.691 0-1.153-.462T4 18.384V5.616q0-.691.463-1.153T5.616 4h5.903q.214 0 .357.143t.143.357t-.143.357t-.357.143H5.616q-.231 0-.424.192T5 5.616v12.769q0 .23.192.423t.423.192h5.904q.214 0 .357.143t.143.357t-.143.357t-.357.143zm12.444-7.5H9.692q-.213 0-.356-.143T9.192 12t.143-.357t.357-.143h8.368l-1.971-1.971q-.141-.14-.15-.338q-.01-.199.15-.364q.159-.165.353-.168q.195-.003.36.162l2.614 2.613q.242.243.242.566t-.243.566l-2.613 2.613q-.146.146-.347.153t-.366-.159q-.16-.165-.157-.357t.162-.35z"/></svg>`,
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
			<div class="wheel-content relative select-none">
				<svg class="wheel-svg select-none" width="960" height="960" viewBox="0 0 960 960" style="user-select: none; -webkit-user-select: none; -moz-user-select: none;">
				</svg>
			</div>
		`;
  }

	private _renderWheel(): void {
		const svg = this._element.querySelector(".wheel-svg") as SVGElement;
		if (!svg) return;

    const centerX = 480;
    const centerY = 480;
    const radius = 360;
    const innerRadius = 90;
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
		centerCircle.setAttribute("stroke-width", "1");
		centerCircle.setAttribute(
			"class",
			"cursor-pointer transition-all duration-200 hover:fill-gray-600/90"
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
			path.setAttribute("stroke-width", "1");
			path.setAttribute(
				"class",
				"cursor-pointer transition-all duration-200 hover:fill-gray-600/90"
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

			const hasIcon = !!option.icon;
			const hasLabel = !!option.label;

			if (hasIcon) {
				if (option.icon!.startsWith("<svg")) {
					const foreignObject = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"foreignObject"
					);
					const iconSize = 48;
					foreignObject.setAttribute("x", (textX - iconSize / 2).toString());
					foreignObject.setAttribute(
						"y",
						(textY - (hasLabel ? 18 : 0) - iconSize / 2).toString()
					);
					foreignObject.setAttribute("width", iconSize.toString());
					foreignObject.setAttribute("height", iconSize.toString());

					const div = document.createElement("div"); // No NS for HTML elements
					div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
					div.style.color = isSelected
						? UI_THEME.wheel.svg.text.selected
						: UI_THEME.wheel.svg.text.normal;
					div.innerHTML = option.icon!;
					const svgInDiv = div.querySelector('svg');
					if (svgInDiv) {
						svgInDiv.style.width = '100%';
						svgInDiv.style.height = '100%';
					}

					foreignObject.appendChild(div);
					textGroup.appendChild(foreignObject);
				} else {
					// Fallback for emojis
					const iconText = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"text"
					);
					iconText.setAttribute("x", textX.toString());
					iconText.setAttribute("y", (textY - (hasLabel ? 18 : 0)).toString());
					iconText.setAttribute("text-anchor", "middle");
					iconText.setAttribute("dominant-baseline", "middle");
					iconText.setAttribute(
						"fill",
						isSelected
							? UI_THEME.wheel.svg.text.selected
							: UI_THEME.wheel.svg.text.normal
					);
					iconText.setAttribute("font-size", "48");
					iconText.setAttribute("font-family", UI_THEME.wheel.svg.text.font);
					iconText.setAttribute("font-weight", "300");
					iconText.textContent = option.icon!;
					textGroup.appendChild(iconText);
				}
			}

			if (hasLabel) {
				const label = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"text"
				);
				label.setAttribute("x", textX.toString());
				label.setAttribute("y", (textY + (hasIcon ? 18 : 0)).toString());
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
				label.textContent = option.label!;
				textGroup.appendChild(label);
			}

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
			backIndicator.setAttribute("fill", "rgb(156, 163, 175)");
			backIndicator.setAttribute("font-size", "20");
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
