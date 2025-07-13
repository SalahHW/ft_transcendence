/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   serviceInitializer.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/13 17:35:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 18:03:51 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import CacheManager from './CacheManager.js';
import AvatarService from './AvatarService.js';
import FriendsService from './FriendsService.js';
import MatchHistoryService from './MatchHistoryService.js';
import UserProfileService from './UserProfileService.js';

export function initializeServices(): void {
    console.log("Initializing services...");

    CacheManager.getInstance();

    AvatarService.getInstance();
    FriendsService.getInstance();
    MatchHistoryService.getInstance();
    UserProfileService.getInstance();

    console.log("Services initialized and registered with CacheManager.");

    const cacheStats = CacheManager.getInstance().getStats();
    console.log(`[CacheManager] Initial Stats: ${cacheStats.services} services registered, monitoring ${cacheStats.events} events.`);
}
