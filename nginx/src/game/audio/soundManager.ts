/**
 * Manages game sound effects
 */
class SoundManager {
    private sounds: { [key: string]: HTMLAudioElement } = {};
    private isEnabled: boolean = true;
    private volume: number = 0.5;
    private isInitialized: boolean = false;

    /**
     * Preload sound files
     */
    async preloadSounds(): Promise<void> {
        // FIXED: Use current domain instead of localhost for sound files
        // Sound files are served through nginx, so use same domain as frontend
        const soundFiles = {
            paddleHit: `${window.location.protocol}//${window.location.host}/sounds/matchSounds/pop.mp3`,
            wallHit: `${window.location.protocol}//${window.location.host}/sounds/matchSounds/laser_low.mp3`,
            lostPoint: `${window.location.protocol}//${window.location.host}/sounds/matchSounds/lost_point.mp3`,
            playerScored: `${window.location.protocol}//${window.location.host}/sounds/matchSounds/player_scored.mp3`,
            winnerSound: `${window.location.protocol}//${window.location.host}/sounds/endGameSounds/winner_sound.mp3`,
            loserSound: `${window.location.protocol}//${window.location.host}/sounds/endGameSounds/looser_sound.mp3`
        };

        console.log('Preloading sounds...');
        
        for (const [name, path] of Object.entries(soundFiles)) {
            try {
                const audio = new Audio(path);
                audio.volume = this.volume;
                audio.preload = 'auto';
                
                // Wait for audio to be loaded
                await new Promise<void>((resolve, reject) => {
                    audio.addEventListener('canplaythrough', () => resolve());
                    audio.addEventListener('error', reject);
                    audio.load();
                });
                
                this.sounds[name] = audio;
                console.log(`✓ Loaded sound: ${name}`);
            } catch (error) {
                console.warn(`Failed to load sound: ${name}`, error);
            }
        }
        
        this.isInitialized = true;
        console.log('Sound manager initialized');
    }

    /**
     * Play a sound effect
     */
    playSound(soundName: string, volumeMultiplier: number = 1): void {
        if (!this.isEnabled || !this.isInitialized || !this.sounds[soundName]) {
            if (!this.sounds[soundName]) {
                console.warn(`Sound not found: ${soundName}. Available sounds:`, Object.keys(this.sounds));
            }
            return;
        }

        const sound = this.sounds[soundName];
        
        // Clone the audio to allow overlapping sounds
        const audioClone = sound.cloneNode() as HTMLAudioElement;
        audioClone.volume = this.volume * volumeMultiplier;
        
        audioClone.play().catch(error => {
            console.warn(`Failed to play sound: ${soundName}`, error);
        });
    }

    /**
     * Set master volume (0 to 1)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }

    /**
     * Enable/disable sounds
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        console.log(`Sounds ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current volume
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     * Check if sounds are enabled
     */
    isAudioEnabled(): boolean {
        return this.isEnabled;
    }
}

export const soundManager = new SoundManager(); 