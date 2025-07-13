import UserProfileService from "../../../services/UserProfileService.js";
import { createWinRateDonutChart } from "./WinRateDonutChart.js";
import AvatarService from "../../../services/AvatarService.js";

const UPLOAD_ICON_SVG = `<svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="white" stroke-linecap="round" stroke-width="1.5"><path d="M17 9.002c2.175.012 3.353.109 4.121.877C22 10.758 22 12.172 22 15v1c0 2.829 0 4.243-.879 5.122C20.243 22 18.828 22 16 22H8c-2.828 0-4.243 0-5.121-.878C2 20.242 2 18.829 2 16v-1c0-2.828 0-4.242.879-5.121c.768-.768 1.946-.865 4.121-.877" opacity=".5"/><path stroke-linejoin="round" d="M12 15V2m0 0l3 3.5M12 2L9 5.5"/></g></svg>`;
const DELETE_ICON_SVG = `<svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m18 9l-.84 8.398c-.127 1.273-.19 1.909-.48 2.39a2.5 2.5 0 0 1-1.075.973C15.098 21 14.46 21 13.18 21h-2.36c-1.279 0-1.918 0-2.425-.24a2.5 2.5 0 0 1-1.076-.973c-.288-.48-.352-1.116-.48-2.389L6 9m7.5 6.5v-5m-3 5v-5m-6-4h4.615m0 0l.386-2.672c.112-.486.516-.828.98-.828h3.038c.464 0 .867.342.98.828l.386 2.672m-5.77 0h5.77m0 0H19.5"/></svg>`;


export class UserProfileView {
	private static _userProfileService = UserProfileService.getInstance();
	private static _avatarService = AvatarService.getInstance();

	private static truncateWallet(wallet: string): string {
		if (!wallet || wallet.length <= 10) return wallet;
		return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
	}

	public static async render(): Promise<string> {
		try {
			const user = await this._userProfileService.getEnrichedUserProfile();

			return /* HTML */`
				<div class="flex gap-2 h-full overflow-auto">
					<div id="avatar-container" class="relative flex-[1] rounded-lg p-4 aspect-square">
						<img id="avatar-img" src="${user.avatarUrl}" alt="Profile Picture" class="w-full h-full object-cover text-white rounded-lg transition-all duration-300">
						<div id="avatar-overlay" class="absolute inset-4 bg-black/50 rounded-lg flex items-center justify-center opacity-0 transition-opacity duration-300 cursor-pointer pointer-events-none">
						</div>
						<input type="file" id="avatar-upload-input" class="hidden" accept="image/*">
					</div>
					<div class="flex-[2] rounded-lg p-4 flex flex-col justify-start items-start">
						<div id="username-wrapper" class="flex items-center gap-2 mb-4">
							<h2 class="text-4xl font-bold text-white">${user.username || 'Unknown'}</h2>
						</div>
						${
							user.authenticationMethod === "credentials" && user.email ?
								`<div id="email-wrapper" class="flex items-center gap-2 mb-4">
									<p class="text-gray-500">${user.email}</p>
								</div>`
								: ''
						}
						<div class="flex items-center gap-2 mb-4">
							<p class="text-gray-500">${user.wallet ? UserProfileView.truncateWallet(user.wallet) : 'No wallet'}</p>
						</div>
					</div>
					<div class="flex flex-col gap-2 p-4 w-12">
						<button id="edit-profile-btn" class="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200">
							✏️
						</button>
					</div>
					<div class="flex-[1] rounded-lg p-4 aspect-square flex">
						${createWinRateDonutChart({
							wins: user.totalWins,
							losses: user.totalLosses
						})}
					</div>
				</div>
			`;
		} catch (error) {
			console.error("Error rendering UserProfile:", error);
			return /* HTML */`
				<div class="flex gap-2 h-full overflow-auto">
					<div class="flex-[1] rounded-lg p-4 flex items-center justify-center">
						<p class="text-red-500">Error loading user profile</p>
					</div>
				</div>
			`;
		}
	}

	public static async addEventListeners(): Promise<void> {
		const editButton = document.getElementById('edit-profile-btn');
		const usernameWrapper = document.getElementById('username-wrapper');
		const emailWrapper = document.getElementById('email-wrapper');
		const avatarContainer = document.getElementById('avatar-container');
		const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;
		const avatarOverlay = document.getElementById('avatar-overlay');
		const avatarUploadInput = document.getElementById('avatar-upload-input') as HTMLInputElement;

		if (!editButton || !usernameWrapper || !avatarContainer || !avatarImg || !avatarOverlay || !avatarUploadInput)
			return;

		try {
			const user = await this._userProfileService.getEnrichedUserProfile();
			const originalAvatarSrc = user.avatarUrl;

			let newAvatarFile: File | null = null;
			let objectUrlToRevoke: string | null = null;
			let isDefaultAvatar = originalAvatarSrc.includes('defaultAvatar.jpg');

			const updateAvatarOverlay = () => {
				if (avatarOverlay) {
					avatarOverlay.innerHTML = isDefaultAvatar ? UPLOAD_ICON_SVG : DELETE_ICON_SVG;
				}
			};

			updateAvatarOverlay();

			const handleAvatarClick = () => {
				if (isDefaultAvatar) {
					avatarUploadInput.click();
				} else {
					if (confirm("Are you sure you want to delete your avatar and use the default one?")) {
						deleteAvatar();
					}
				}
			};

			const deleteAvatar = async () => {
				try {
					await this._avatarService.deleteCurrentUserAvatar();
					const newAvatarUrl = await this._avatarService.getCurrentUserAvatarUrl();
					avatarImg.src = `${newAvatarUrl}?t=${new Date().getTime()}`;
					isDefaultAvatar = true;
					updateAvatarOverlay();
					this._showNotification("Avatar deleted successfully!", "success");
				} catch (error) {
					console.error("Error deleting avatar:", error);
					this._showNotification("Error deleting avatar", "error");
				}
			};

			const handleFileSelect = () => {
				const file = avatarUploadInput.files?.[0];
				if (file) {
					newAvatarFile = file;
					if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
					objectUrlToRevoke = URL.createObjectURL(file);
					avatarImg.src = objectUrlToRevoke;
					isDefaultAvatar = false;
					updateAvatarOverlay();
				}
			};

			const editHandler = () => {
				const originalUsername = user.username || '';
				const originalEmail = user.email || '';

				const usernameH2 = usernameWrapper.querySelector('h2');
				if (usernameH2) {
					const h2Rect = usernameH2.getBoundingClientRect();
					usernameWrapper.innerHTML = `<input name="username" type="text" value="${originalUsername}" class="text-4xl font-bold text-white bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:bg-black/30 w-full max-w-full transition-all duration-200 p-2">`;
					const input = usernameWrapper.querySelector('input');
					if (input) {
						input.style.height = `${h2Rect.height}px`;
						input.style.boxSizing = 'border-box';
						input.focus();
						input.setSelectionRange(originalUsername.length, originalUsername.length);
					}
				}

				if (emailWrapper) {
					const emailP = emailWrapper.querySelector('p');
					if (emailP) {
						const pRect = emailP.getBoundingClientRect();
						emailWrapper.innerHTML = `<input name="email" type="email" value="${originalEmail}" class="text-gray-200 bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:bg-black/30 w-full max-w-full transition-all duration-200 p-2 text-base">`;
						const input = emailWrapper.querySelector('input');
						if (input) {
							input.style.height = `${pRect.height}px`;
							input.style.boxSizing = 'border-box';
						}
					}
				}

				avatarImg.style.filter = 'brightness(50%)';
				avatarOverlay.style.opacity = '1';
				avatarOverlay.style.pointerEvents = 'auto';
				avatarOverlay.addEventListener('click', handleAvatarClick);
				avatarUploadInput.addEventListener('change', handleFileSelect);

				editButton.innerHTML = '✔️';

				let isFinishing = false;
				const finishEditing = async (save: boolean) => {
					if (isFinishing) return;
						isFinishing = true;

					document.removeEventListener('keydown', keydownHandler);
					editButton.removeEventListener('click', saveHandler);

					const usernameInput = usernameWrapper.querySelector('input[name="username"]') as HTMLInputElement;
					const emailInput = emailWrapper?.querySelector('input[name="email"]') as HTMLInputElement;

					const newUsername = usernameInput?.value?.trim();
					const newEmail = emailInput?.value?.trim();

					if (save) {
						const avatarChanged = newAvatarFile !== null;

						if (newUsername && newUsername !== originalUsername) {
							try {
								await this._userProfileService.updateUsername(newUsername);
								this._showNotification("Username updated successfully!", "success");
							} catch (error) {
								console.error("Error updating username:", error);
								this._showNotification("Error updating username", "error");
								save = false;
							}
						}

						if (emailInput && newEmail && newEmail !== originalEmail) {
							try {
								await this._userProfileService.updateEmail(newEmail);
								this._showNotification("Email updated successfully!", "success");
							} catch (error) {
								console.error("Error updating email:", error);
								this._showNotification("Error updating email", "error");
								save = false;
							}
						}

						if (avatarChanged && newAvatarFile) {
							try {
								await this._avatarService.uploadOrUpdateCurrentUserAvatar(newAvatarFile);
								this._showNotification("Avatar updated successfully!", "success");
							} catch (error) {
								console.error("Error updating avatar:", error);
								this._showNotification("Error updating avatar", "error");
								save = false;
							}
						}
					}

					const updatedUser = await this._userProfileService.getEnrichedUserProfile();

					usernameWrapper.innerHTML = `<h2 class="text-4xl font-bold text-white">${updatedUser.username}</h2>`;

					if (emailWrapper && updatedUser.email) {
						emailWrapper.innerHTML = `<p class="text-gray-500">${updatedUser.email}</p>`;
					}

					avatarImg.style.filter = 'brightness(100%)';
					avatarOverlay.style.opacity = '0';
					avatarOverlay.style.pointerEvents = 'none';
					avatarOverlay.removeEventListener('click', handleAvatarClick);
					avatarUploadInput.removeEventListener('change', handleFileSelect);

					if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);

					if (!save) {
						avatarImg.src = originalAvatarSrc;
					} else {
						const newAvatarUrl = await this._avatarService.getCurrentUserAvatarUrl();
						avatarImg.src = `${newAvatarUrl}?t=${new Date().getTime()}`;
					}

					editButton.innerHTML = '✏️';
					editButton.addEventListener('click', editHandler);
					isFinishing = false;
				};

				const saveHandler = () => finishEditing(true);
				const keydownHandler = (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						finishEditing(true);
					}
					if (e.key === 'Escape') finishEditing(false);
				};

				editButton.removeEventListener('click', editHandler);
				editButton.addEventListener('click', saveHandler);
				document.addEventListener('keydown', keydownHandler);
			};

			editButton.addEventListener('click', editHandler);
		} catch (error) {
			console.error("Error setting up event listeners:", error);
		}
	}

	private static _showNotification(message: string, type: 'success' | 'error'): void {
		const notification = document.createElement('div');
		notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 transition-all duration-300 ${
			type === 'success' ? 'bg-green-500' : 'bg-red-500'
		}`;
		notification.textContent = message;

		document.body.appendChild(notification);

		setTimeout(() => {
			notification.style.opacity = '0';
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 300);
		}, 3000);
	}
}
