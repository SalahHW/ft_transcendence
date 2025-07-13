/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CacheManager.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/13 16:50:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 20:02:53 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export interface CacheableService {
    clearCache(): void;
    serviceName: string;
}

export interface CacheEvent {
    type: 'USER_LOGIN' | 'USER_LOGOUT' | 'MATCH_REPORTED' | 'MATCH_ADDED' | 'FRIEND_ADDED' | 'FRIEND_REMOVED' | 'AVATAR_UPDATED' | 'PROFILE_UPDATED' | 'TOURNAMENT_REPORTED';
    data?: any;
}

/**
 * Centralized cache management service using Singleton pattern.
 * Allows services to register their cache invalidation methods
 * and provides a clean API for cache management across the application.
 */
export default class CacheManager {
    private static _instance: CacheManager;
    private _services: Map<string, CacheableService> = new Map();
    private _eventHandlers: Map<string, string[]> = new Map(); // event -> serviceNames[]
    private _cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

    private constructor() {
        this._setupEventHandlers();
    }

    public static getInstance(): CacheManager {
        if (!CacheManager._instance) {
            CacheManager._instance = new CacheManager();
        }
        return CacheManager._instance;
    }

    /**
     * Register a service for cache management
     * @param service - The service implementing CacheableService interface
     * @param events - Array of events that should trigger cache invalidation for this service
     */
    public registerService(service: CacheableService, events: string[] = []): void {
        this._services.set(service.serviceName, service);

        // Register event handlers
        events.forEach(event => {
            if (!this._eventHandlers.has(event)) {
                this._eventHandlers.set(event, []);
            }
            this._eventHandlers.get(event)!.push(service.serviceName);
        });

        console.log(`[CacheManager] Registered service: ${service.serviceName} for events: ${events.join(', ')}`);
    }

    /**
     * Unregister a service from cache management
     * @param serviceName - Name of the service to unregister
     */
    public unregisterService(serviceName: string): void {
        this._services.delete(serviceName);

        this._eventHandlers.forEach((services) => {
            const index = services.indexOf(serviceName);
            if (index > -1) {
                services.splice(index, 1);
            }
        });

        console.log(`[CacheManager] Unregistered service: ${serviceName}`);
    }

    /**
     * Clear cache for a specific service
     * @param serviceName - Name of the service whose cache should be cleared
     */
    public clearServiceCache(serviceName: string): void {
        const service = this._services.get(serviceName);
        if (service) {
            service.clearCache();
            console.log(`[CacheManager] Cleared cache for service: ${serviceName}`);
        } else {
            console.warn(`[CacheManager] Service not found: ${serviceName}`);
        }
    }

    /**
     * Clear cache for all registered services
     */
    public clearAllCaches(): void {
        this._services.forEach((service) => {
            service.clearCache();
        });
        this._cache.clear();
        console.log('[CacheManager] Cleared all caches');
    }

    /**
     * Clear cache for services registered for a specific event
     * @param event - The event type
     */
    public clearCachesForEvent(event: string): void {
        const servicesToClear = this._eventHandlers.get(event) || [];
        servicesToClear.forEach(serviceName => {
            this.clearServiceCache(serviceName);
        });
        console.log(`[CacheManager] Cleared caches for event '${event}': ${servicesToClear.join(', ')}`);
    }

    /**
     * Trigger a cache event
     * @param event - The event to trigger
     */
    public triggerEvent(event: CacheEvent): void {
        console.log(`[CacheManager] Triggering event: ${event.type}`, event.data);
        this.clearCachesForEvent(event.type);
    }

    /**
     * Generic cache methods for simple key-value caching
     */
    public set(key: string, value: any, ttl: number = 5 * 60 * 1000): void {
        this._cache.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl
        });
    }

    public get(key: string): any | null {
        const item = this._cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > item.ttl) {
            this._cache.delete(key);
            return null;
        }

        return item.data;
    }

    public delete(key: string): void {
        this._cache.delete(key);
    }

    /**
     * Get cache statistics
     */
    public getStats(): { services: number; events: number; cacheEntries: number } {
        return {
            services: this._services.size,
            events: this._eventHandlers.size,
            cacheEntries: this._cache.size
        };
    }

    /**
     * Setup default event handlers for common application events
     */
    private _setupEventHandlers(): void {
        // Listen for authentication events
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token' && !e.newValue) {
                this.triggerEvent({ type: 'USER_LOGOUT' });
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.triggerEvent({ type: 'USER_LOGIN' });
        });
    }
}
