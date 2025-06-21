/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Wheel.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/05 16:41:12 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/21 16:29:24 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Router from "../router/Router.js";
import { UI_THEME } from "../style/tailwindClasses.js";

interface Option {
	label: string;
	onClick?: () => void;
	subMenu?: Option[];
	icon?: string;
}

export default class Wheel {
    private _element: HTMLElement;
	private _currentOptions: Option[] = [];
	private _optionHistory: Option[][] = []; // Pour naviguer dans les sous-menus
	private _selectedIndex: number = 0;
	private _isVisible: boolean = false;
	private _router: Router = Router.getInstance();
	private _wheelOptions: Option[] = [
		{
			label: "API Test page",
			icon: "🔧",
			onClick: () => {
				console.log("API Test page clicked");
				this.hideWheel();
				this._router.navigate("/api-test");
			},
		},
		{
			label: "Profile",
			icon: "👤",
			onClick: () => {
				this.hideWheel();
				this._router.navigate("/profile");
			}
		},
		{
			label: "Login",
			icon: "🔑",
			subMenu: [
				{
					label: "Sign In",
					icon: "→",
					onClick: () => {
						console.log("Sign In clicked");
						this.hideWheel();
						this._router.navigate("/login");
					}
				},
				{
					label: "Register",
					icon: "+",
					onClick: () => {
						console.log("Register clicked");
						this.hideWheel();
						this._router.navigate("/register");
					}
				}
			]
		}
	];

	constructor(elementId: string) {
		this._element = document.getElementById(elementId)!;
		if (!this._element) {
			throw new Error(`Element with id ${elementId} not found`);
		}

		// Initialiser avec les options principales
		this._currentOptions = this._wheelOptions;

		// Gestion des événements clavier
		this._setupKeyboardEvents();
		this._setupMouseEvents();

		// Initialiser le rendu
		this.render();
	}

	private _setupKeyboardEvents(): void {
		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Shift") {
				event.preventDefault();
				this.showWheel();
			}

			if (this._isVisible) {
				switch (event.key) {
					case "ArrowUp":
					case "ArrowLeft":
						event.preventDefault();
						this._navigateWheel(-1);
						break;
					case "ArrowDown":
					case "ArrowRight":
						event.preventDefault();
						this._navigateWheel(1);
						break;
					case "Enter":
					case " ":
						event.preventDefault();
						this._selectOption();
						break;
					case "Escape":
						event.preventDefault();
						this._goBack();
						break;
				}
			}
		});

		document.addEventListener("keyup", (event: KeyboardEvent) => {
			if (event.key === "Shift") {
				this.hideWheel();
			}
		});
	}

	private _setupMouseEvents(): void {
		this._element.addEventListener("click", (event: MouseEvent) => {
			event.stopPropagation();
		});

		// Fermer la roue si on clique à l'extérieur
		document.addEventListener("click", () => {
			if (this._isVisible) {
				this.hideWheel();
			}
		});
	}

	private _navigateWheel(direction: number): void {
		const newIndex = this._selectedIndex + direction;
		if (newIndex >= 0 && newIndex < this._currentOptions.length) {
			this._selectedIndex = newIndex;
			this._updateSelection();
		}
	}

	private _selectOption(): void {
		const selectedOption = this._currentOptions[this._selectedIndex];
		if (!selectedOption) return;

		if (selectedOption.subMenu && selectedOption.subMenu.length > 0) {
			// Naviguer vers le sous-menu
			this._optionHistory.push(this._currentOptions);
			this._currentOptions = selectedOption.subMenu;
			this._selectedIndex = 0;
			this._renderWheel();
		} else if (selectedOption.onClick) {
			// Exécuter l'action
			selectedOption.onClick();
			this.hideWheel();
		}
	}

	private _goBack(): void {
		if (this._optionHistory.length > 0) {
			this._currentOptions = this._optionHistory.pop()!;
			this._selectedIndex = 0;
			this._renderWheel();
		} else {
			this.hideWheel();
		}
	}

	private _updateSelection(): void {
		this._renderWheel();
	}

	public showWheel(): void {
		if (this._isVisible) return;

		this._isVisible = true;
		this._selectedIndex = 0;
		this._currentOptions = this._wheelOptions;
		this._optionHistory = [];

		this._element.classList.remove("hidden");
		this._element.classList.add("flex");
		this._renderWheel();

		// Animation d'entrée
		requestAnimationFrame(() => {
			this._element.classList.add("opacity-100", "scale-100");
			this._element.classList.remove("opacity-0", "scale-95");
		});
	}

	public hideWheel(): void {
		if (!this._isVisible) return;

		this._isVisible = false;

		// Animation de sortie
		this._element.classList.add("opacity-0", "scale-95");
		this._element.classList.remove("opacity-100", "scale-100");

		setTimeout(() => {
			this._element.classList.add("hidden");
			this._element.classList.remove("flex");
		}, 150);
	}

	public render(): void {
		// Structure de base de la roue avec les styles centralisés
		this._element.className = UI_THEME.components.overlay;

		this._element.innerHTML = `
			<div class="wheel-content relative select-none">
				<svg class="wheel-svg select-none" width="960" height="960" viewBox="0 0 960 960" style="user-select: none; -webkit-user-select: none; -moz-user-select: none;">
					<!-- Le contenu sera généré dynamiquement -->
				</svg>
			</div>
		`;
	}

	private _renderWheel(): void {
		const svg = this._element.querySelector('.wheel-svg') as SVGElement;
		if (!svg) return;

		const centerX = 480;
		const centerY = 480;
		const radius = 360;
		const innerRadius = 90; // Réduit de moitié (180 → 90)
		const optionCount = this._currentOptions.length;

		// Nettoyer le SVG
		svg.innerHTML = '';

		if (optionCount === 0) return;

		const angleStep = (2 * Math.PI) / optionCount;
		const startAngle = -Math.PI / 2; // Commencer en haut

		// Créer le cercle central avec les styles centralisés
		const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		centerCircle.setAttribute('cx', centerX.toString());
		centerCircle.setAttribute('cy', centerY.toString());
		centerCircle.setAttribute('r', innerRadius.toString());
		centerCircle.setAttribute('fill', UI_THEME.wheel.svg.fill.center);
		centerCircle.setAttribute('stroke', UI_THEME.wheel.svg.stroke.normal);
		centerCircle.setAttribute('stroke-width', '1');
		centerCircle.setAttribute('class', 'cursor-pointer transition-all duration-200 hover:fill-gray-600/90');

		// Gestionnaire de clic pour revenir en arrière
		centerCircle.addEventListener('click', () => {
			this._goBack();
		});

		svg.appendChild(centerCircle);

		this._currentOptions.forEach((option, index) => {
			const angle1 = startAngle + index * angleStep;
			const angle2 = startAngle + (index + 1) * angleStep;

			const isSelected = index === this._selectedIndex;

			// Calculer les points du segment
			const x1 = centerX + Math.cos(angle1) * innerRadius;
			const y1 = centerY + Math.sin(angle1) * innerRadius;
			const x2 = centerX + Math.cos(angle1) * radius;
			const y2 = centerY + Math.sin(angle1) * radius;
			const x3 = centerX + Math.cos(angle2) * radius;
			const y3 = centerY + Math.sin(angle2) * radius;
			const x4 = centerX + Math.cos(angle2) * innerRadius;
			const y4 = centerY + Math.sin(angle2) * innerRadius;

			// Créer le segment
			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			const largeArcFlag = angleStep > Math.PI ? 1 : 0;

			const pathData = [
				`M ${x1} ${y1}`,
				`L ${x2} ${y2}`,
				`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
				`L ${x4} ${y4}`,
				`A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
				'Z'
			].join(' ');

			path.setAttribute('d', pathData);
			path.setAttribute('fill', isSelected ? UI_THEME.wheel.svg.fill.selected : UI_THEME.wheel.svg.fill.normal);
			path.setAttribute('stroke', isSelected ? UI_THEME.wheel.svg.stroke.selected : UI_THEME.wheel.svg.stroke.normal);
			path.setAttribute('stroke-width', '1');
			path.setAttribute('class', 'cursor-pointer transition-all duration-200 hover:fill-gray-600/90');

			// Gestionnaire de clic
			path.addEventListener('click', () => {
				this._selectedIndex = index;
				this._selectOption();
			});

			// Gestionnaire de survol
			path.addEventListener('mouseenter', () => {
				if (!isSelected) {
					this._selectedIndex = index;
					this._updateSelection();
				}
			});

			svg.appendChild(path);

			// Ajouter le texte et l'icône
			const textAngle = angle1 + angleStep / 2;
			const textRadius = (radius + innerRadius) / 2;
			const textX = centerX + Math.cos(textAngle) * textRadius;
			const textY = centerY + Math.sin(textAngle) * textRadius;

			// Créer un groupe pour le texte et l'icône
			const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
			textGroup.setAttribute('class', 'pointer-events-none');
			textGroup.style.userSelect = 'none';
			textGroup.style.webkitUserSelect = 'none';
			(textGroup.style as any).MozUserSelect = 'none';

			// Icône
			if (option.icon) {
				const iconText = document.createElementNS("http://www.w3.org/2000/svg", "text");
				iconText.setAttribute('x', textX.toString());
				iconText.setAttribute('y', (textY - 20).toString());
				iconText.setAttribute('text-anchor', 'middle');
				iconText.setAttribute('dominant-baseline', 'middle');
				iconText.setAttribute('fill', isSelected ? UI_THEME.wheel.svg.text.selected : UI_THEME.wheel.svg.text.normal);
				iconText.setAttribute('font-size', '32');
				iconText.setAttribute('font-family', UI_THEME.wheel.svg.text.font);
				iconText.setAttribute('font-weight', '300');
				iconText.textContent = option.icon;
				textGroup.appendChild(iconText);
			}

			// Label
			const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
			label.setAttribute('x', textX.toString());
			label.setAttribute('y', (textY + 20).toString());
			label.setAttribute('text-anchor', 'middle');
			label.setAttribute('dominant-baseline', 'middle');
			label.setAttribute('fill', isSelected ? UI_THEME.wheel.svg.text.selected : UI_THEME.wheel.svg.text.normal);
			label.setAttribute('font-size', '24');
			label.setAttribute('font-weight', isSelected ? '500' : '400');
			label.setAttribute('font-family', UI_THEME.wheel.svg.text.font);
			label.textContent = option.label;
			textGroup.appendChild(label);

			svg.appendChild(textGroup);
		});

		// Ajouter un petit indicateur au centre si on est dans un sous-menu
		if (this._optionHistory.length > 0) {
			const backIndicator = document.createElementNS("http://www.w3.org/2000/svg", "text");
			backIndicator.setAttribute('x', centerX.toString());
			backIndicator.setAttribute('y', centerY.toString());
			backIndicator.setAttribute('text-anchor', 'middle');
			backIndicator.setAttribute('dominant-baseline', 'middle');
			backIndicator.setAttribute('fill', 'rgb(156, 163, 175)');
			backIndicator.setAttribute('font-size', '20');
			backIndicator.setAttribute('font-family', 'SF Pro Display, system-ui, -apple-system, sans-serif');
			backIndicator.setAttribute('font-weight', '400');
			backIndicator.textContent = '← ESC';
			svg.appendChild(backIndicator);
		}
	}
}
