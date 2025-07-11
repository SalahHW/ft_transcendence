/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   APITestPage.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/27 19:14:29 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/11 15:06:01 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import ModalView from "../../components/ModalView.js";
import Tabs from "./components/tabs.js";
// ADDED MISSING IMPORTS
import Router from "../../router/Router.js";
import { buttonHTML } from "../../components/button.js";

// User forms
import GetUserForm from "./userForms/GetUserForm.js";
import CreateUserForm from "./userForms/CreateUserForm.js";
import UpdateUserForm from "./userForms/UpdateUserForm.js";
import DeleteUserForm from "./userForms/DeleteUserForm.js";

// Match forms
import GetMatchForm from "./matchForms/GetMatchForm.js";
import CreateMatchForm from "./matchForms/CreateMatchForm.js";

// Current user forms
import GetCurrentUserForm from "./currentUserForms/GetCurrentUserForm.js";
import LoginLogoutUserForm from "./currentUserForms/LoginLogoutUserForm.js";
import RegisterUserForm from "./currentUserForms/RegisterUserForm.js";

// Avatar forms
import GetAvatarForm from "./avatarForms/GetAvatarForm.js";
import CreateAvatarForm from "./avatarForms/CreateAvatarForm.js";
import UpdateAvatarForm from "./avatarForms/UpdateAvatarForm.js";
import DeleteAvatarForm from "./avatarForms/DeleteAvatarForm.js";

// Friends forms
import CreateFriendshipForm from "./friendsForms/CreateFriendshipForm.js";
import GetFriendshipsForm from "./friendsForms/GetFriendshipsForm.js";
import DeleteFriendshipForm from "./friendsForms/DeleteFriendshipForm.js";

export default class APITestPage extends ModalView {
	private _terminalInstance: any = null;

	constructor() {
		super({
			width: '90vw',
			height: '90vh',
			contentContainerClasses: 'p-6'
		});
	}

	public show(): void {
		if (this._isVisible) return;
		this.render();
		super.show();
	}

	public render(): void {
		this._contentContainer.innerHTML = /* HTML */ `
			<div class="w-full h-full flex flex-col">
				<h1 class="text-3xl font-bold mb-4 text-center text-gradient bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow">API Test Page</h1>
				<div class="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
					<!-- First card -->
					<div class="flex-1 bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-[#5A5A5A] p-6 min-h-0 flex flex-col overflow-hidden">
						<div class="w-full h-full flex flex-col">
							<div class="flex-grow min-h-0">
								<div id="left-card-content" class="h-full"></div>
							</div>
						</div>
					</div>
					<!-- Second card -->
					<div class="flex-1 bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-[#5A5A5A] p-6 min-h-0 flex flex-col overflow-hidden">
						<div class="w-full h-full flex flex-col">
							<div class="flex-grow min-h-0">
								<div id="right-card-content" class="h-full"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
		this._renderLeftCardContent();
		this._renderRightCardContent();
	}

	private _renderLeftCardContent(): void {
		const tabs = new Tabs(
			"left-card-content", ["User API", "Match API", "Current User API", "Game API", "Avatar API", "Friends API"]
		);

		const userContainer = document.createElement('div');
		userContainer.id = "user-forms-container";
		tabs.setTabContent(0, userContainer);

		this._renderUserForms();

		const matchContainer = document.createElement('div');
		matchContainer.id = "match-forms-container";
		tabs.setTabContent(1, matchContainer);

		this._renderMatchForms();

		const currentUserContainer = document.createElement('div');
		currentUserContainer.id = "current-user-form-container";
		tabs.setTabContent(2, currentUserContainer);

		this._renderCurrentUserForms();

		const gameContainer = document.createElement('div');
		gameContainer.id = "game-forms-container";
		tabs.setTabContent(3, gameContainer);

		this._renderGameForms();

		const avatarContainer = document.createElement('div');
		avatarContainer.id = "avatar-forms-container";
		tabs.setTabContent(4, avatarContainer);

		this._renderAvatarForms();

		const friendsContainer = document.createElement('div');
		friendsContainer.id = "friends-forms-container";
		tabs.setTabContent(5, friendsContainer);

		this._renderFriendsForms();
	}

	private _renderUserForms(): void {
		const tabs = new Tabs(
			"user-forms-container", ["Get User", "Create User", "Update User", "Delete User"]
		);

		/* Get User */
		const getUserContainer = document.createElement('div');
		getUserContainer.id = "get-user-form-container";
		tabs.setTabContent(0, getUserContainer);

		const getUserForm = new GetUserForm("get-user-form-container");
		getUserForm.render();

		/* Create User */
		const createUserContainer = document.createElement('div');
		createUserContainer.id = "create-user-form-container";
		tabs.setTabContent(1, createUserContainer);

		const userForm = new CreateUserForm("create-user-form-container");
		userForm.render();

		/* Update User */
		const updateUserContainer = document.createElement('div');
		updateUserContainer.id = "update-user-form-container";
		tabs.setTabContent(2, updateUserContainer);

		const updateUserForm = new UpdateUserForm("update-user-form-container");
		updateUserForm.render();

		/* Delete User */
		const deleteUserContainer = document.createElement('div');
		deleteUserContainer.id = "delete-user-form-container";
		tabs.setTabContent(3, deleteUserContainer);

		const deleteUserForm = new DeleteUserForm("delete-user-form-container");
		deleteUserForm.render();
	}

	private _renderMatchForms(): void {
		const tabs = new Tabs(
			"match-forms-container", ["Get Match", "Create Match"]
		);

		const getMatchContainer = document.createElement('div');
		getMatchContainer.id = "get-match-form-container";
		tabs.setTabContent(0, getMatchContainer);

		const getMatchForm = new GetMatchForm("get-match-form-container");
		getMatchForm.render();

		const createMatchContainer = document.createElement('div');
		createMatchContainer.id = "create-match-form-container";
		tabs.setTabContent(1, createMatchContainer);

		const createMatchForm = new CreateMatchForm("create-match-form-container");
		createMatchForm.render();
	}

	private _renderCurrentUserForms(): void {
		const tabs = new Tabs(
			"current-user-form-container", ["Get Me", "Login/Logout", "Register"]
		);

		const getMeContainer = document.createElement('div');
		getMeContainer.id = "get-current-user-form-container";
		tabs.setTabContent(0, getMeContainer);

		const getMeUserForm = new GetCurrentUserForm("get-current-user-form-container");
		getMeUserForm.render();

		const loginLogoutContainer = document.createElement('div');
		loginLogoutContainer.id = "login-logout-form-container";
		tabs.setTabContent(1, loginLogoutContainer);

		const loginLogoutUserForm = new LoginLogoutUserForm("login-logout-form-container");
		loginLogoutUserForm.render();

		const registerContainer = document.createElement('div');
		registerContainer.id = "register-form-container";
		tabs.setTabContent(2, registerContainer);

		const registerUserForm = new RegisterUserForm("register-form-container");
		registerUserForm.render();
	}

	private _renderGameForms(): void {
		const router = Router.getInstance();
		const tabs = new Tabs("game-forms-container", ["1v1", "Tournament",]);
		const oneVsOneContainer = document.createElement('div');
		oneVsOneContainer.id = "one-vs-one-form-container";
		tabs.setTabContent(0, oneVsOneContainer);

		oneVsOneContainer.innerHTML = /* HTML */ `
			<div class="flex flex-col items-center justify-center h-full">
				${buttonHTML({id: "one-vs-one-button", label: "Start 1v1 Game", type: "button",})}
			</div>
		`;

		document.getElementById("one-vs-one-button")?.addEventListener("click", (event) => {
			event.preventDefault();
			router.navigate("/1v1");
		});

		const tournamentContainer = document.createElement('div');
		tournamentContainer.id = "tournament-form-container";
		tabs.setTabContent(1, tournamentContainer);

		tournamentContainer.innerHTML = /* HTML */ `
			<div class="flex flex-col items-center justify-center h-full">
				${buttonHTML({id: "tournament-button", label: "Start Tournament", type: "button",})}
			</div>
		`;

		document.getElementById("tournament-button")?.addEventListener("click", (event) => {
			event.preventDefault();
			router.navigate("/tournament");
		});
	}

	private _renderAvatarForms(): void {
		const tabs = new Tabs(
			"avatar-forms-container", ["Get Avatar", "Create Avatar", "Update Avatar", "Delete Avatar"]
		);

		/* Get Avatar */
		const getAvatarContainer = document.createElement('div');
		getAvatarContainer.id = "get-avatar-form-container";
		tabs.setTabContent(0, getAvatarContainer);

		const getAvatarForm = new GetAvatarForm("get-avatar-form-container");
		getAvatarForm.render();

		/* Create Avatar */
		const createAvatarContainer = document.createElement('div');
		createAvatarContainer.id = "create-avatar-form-container";
		tabs.setTabContent(1, createAvatarContainer);

		const createAvatarForm = new CreateAvatarForm("create-avatar-form-container");
		createAvatarForm.render();

		/* Update Avatar */
		const updateAvatarContainer = document.createElement('div');
		updateAvatarContainer.id = "update-avatar-form-container";
		tabs.setTabContent(2, updateAvatarContainer);

		const updateAvatarForm = new UpdateAvatarForm("update-avatar-form-container");
		updateAvatarForm.render();

		/* Delete Avatar */
		const deleteAvatarContainer = document.createElement('div');
		deleteAvatarContainer.id = "delete-avatar-form-container";
		tabs.setTabContent(3, deleteAvatarContainer);

		const deleteAvatarForm = new DeleteAvatarForm("delete-avatar-form-container");
		deleteAvatarForm.render();
	}

	private _renderFriendsForms(): void {
		const tabs = new Tabs(
			"friends-forms-container", ["Create Friendship", "Get Friendships", "Delete Friendship"]
		);

		/* Create Friendship */
		const createFriendshipContainer = document.createElement('div');
		createFriendshipContainer.id = "create-friendship-form-container";
		tabs.setTabContent(0, createFriendshipContainer);

		const createFriendshipForm = new CreateFriendshipForm("create-friendship-form-container");
		createFriendshipForm.render();

		/* Get Friendships */
		const getFriendshipsContainer = document.createElement('div');
		getFriendshipsContainer.id = "get-friendships-form-container";
		tabs.setTabContent(1, getFriendshipsContainer);

		const getFriendshipsForm = new GetFriendshipsForm("get-friendships-form-container");
		getFriendshipsForm.render();

		/* Delete Friendship */
		const deleteFriendshipContainer = document.createElement('div');
		deleteFriendshipContainer.id = "delete-friendship-form-container";
		tabs.setTabContent(2, deleteFriendshipContainer);

		const deleteFriendshipForm = new DeleteFriendshipForm("delete-friendship-form-container");
		deleteFriendshipForm.render();
	}

	private _renderRightCardContent(): void {
		import('./components/customTerminal.js').then((module) => {
			this._terminalInstance = new module.default("right-card-content");
		});
	}

	protected _onHide(): void {
		// Clean up the terminal when the modal is hidden
		if (this._terminalInstance) {
			// Import and call the static cleanup method
			import('./components/customTerminal.js').then((module) => {
				module.default.restoreConsoleLog();
			});
			this._terminalInstance = null;
		}
	}
}
