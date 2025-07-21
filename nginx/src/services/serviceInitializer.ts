import CacheManager from "./CacheManager.js";
import AvatarService from "./AvatarService.js";
import FriendsService from "./FriendsService.js";
import MatchHistoryService from "./MatchHistoryService.js";
import UserProfileService from "./UserProfileService.js";
import PresenceService from "./webSocket/PresenceService.js";
import AuthService from "./AuthNanoService.js";

export function initializeServices(): void {
  try {
    CacheManager.getInstance();

    AvatarService.getInstance();
    FriendsService.getInstance();
    MatchHistoryService.getInstance();
    UserProfileService.getInstance();
    CacheManager.getInstance();
    const presenceService = PresenceService.getInstance();
    const authService = AuthService.getInstance();

    authService.isLoggedIn().then((loggedIn) => {
      if (loggedIn) presenceService.connect();
    });
  } catch (error) {
    console.error("Failed to initialize services:", error);
  }
}
