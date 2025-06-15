/**
 * Manages game sound effects
 */
class SoundManager {
    constructor() {
        this.sounds = {};
        this.isEnabled = true;
        this.volume = 0.5;
        this.isInitialized = false;
    }

    /**
     * Preload sound files
     */
    async preloadSounds() {
        const soundFiles = {
            paddleHit: '/sounds/matchSounds/pop.mp3',
            wallHit: '/sounds/matchSounds/laser_low.mp3'
        };

        console.log('Preloading sounds...');
        
        for (const [name, path] of Object.entries(soundFiles)) {
            try {
                const audio = new Audio(path);
                audio.volume = this.volume;
                audio.preload = 'auto';
                
                // Wait for audio to be loaded
                await new Promise((resolve, reject) => {
                    audio.addEventListener('canplaythrough', resolve);
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
    playSound(soundName, volumeMultiplier = 1) {
        if (!this.isEnabled || !this.isInitialized || !this.sounds[soundName]) {
            if (!this.sounds[soundName]) {
                console.warn(`Sound not found: ${soundName}`);
            }
            return;
        }

        const sound = this.sounds[soundName];
        
        // Clone the audio to allow overlapping sounds
        const audioClone = sound.cloneNode();
        audioClone.volume = this.volume * volumeMultiplier;
        
        audioClone.play().catch(error => {
            console.warn(`Failed to play sound: ${soundName}`, error);
        });
    }

    /**
     * Set master volume (0 to 1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }

    /**
     * Enable/disable sounds
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`Sounds ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current volume
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Check if sounds are enabled
     */
    isAudioEnabled() {
        return this.isEnabled;
    }
}

export const soundManager = new SoundManager(); 