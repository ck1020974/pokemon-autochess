/**
 * MusicManager handles all background music and sound effects logic.
 * It uses HTMLAudioElement to ensure playback is independent of the game's TimeScale.
 */
class MusicManager {
    private static instance: MusicManager;
    private currentAudio: HTMLAudioElement | null = null;
    private currentTrackName: string | null = null;
    private musicPath: string = 'music/';
    private muted: boolean = false;
    private defaultVolume: number = 0.15;

    private audioCache: Map<string, HTMLAudioElement> = new Map();

    private constructor() { }

    public static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            MusicManager.instance = new MusicManager();
        }
        return MusicManager.instance;
    }

    /**
     * Preload multiple tracks into the cache and wait for them to be ready.
     */
    public async preload(names: string[]): Promise<void> {
        const promises = names.map(name => {
            if (this.audioCache.has(name)) return Promise.resolve();

            return new Promise<void>((resolve) => {
                const audio = new Audio(`${this.musicPath}${name}.OGG`);
                audio.preload = 'auto';

                const onCanPlay = () => {
                    audio.removeEventListener('canplaythrough', onCanPlay);
                    audio.removeEventListener('error', onError);
                    resolve();
                };

                const onError = () => {
                    audio.removeEventListener('canplaythrough', onCanPlay);
                    audio.removeEventListener('error', onError);
                    console.warn(`Failed to preload music: ${name}`);
                    resolve(); // Resolve anyway to not block game
                };

                audio.addEventListener('canplaythrough', onCanPlay);
                audio.addEventListener('error', onError);
                audio.load();
                this.audioCache.set(name, audio);
            });
        });

        await Promise.all(promises);
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.currentAudio) {
            this.currentAudio.muted = muted;
        }
    }

    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Play a single track. Uses cache if available.
     * @param name Name of the file (without extension)
     * @param loop Whether to loop the track
     */
    public play(name: string, loop: boolean = true): HTMLAudioElement {
        // If the same track is already playing, do nothing to avoid stuttering
        if (this.currentTrackName === name && this.currentAudio && !this.currentAudio.paused) {
            return this.currentAudio;
        }

        this.stop();
        this.currentTrackName = name;

        let audio = this.audioCache.get(name);
        if (!audio) {
            audio = new Audio(`${this.musicPath}${name}.OGG`);
            this.audioCache.set(name, audio);
        }

        audio.muted = this.muted;
        audio.volume = this.defaultVolume;
        audio.currentTime = 0;
        audio.loop = loop;

        audio.play().catch(e => {
            console.warn(`Music play failed for ${name}:`, e);
            // If play fails (e.g. user hasn't interacted), we still mark it as current
            // so that if play is called again after interaction, it won't be blocked if it's the same name.
            // But actually, we want it to try playing again.
            this.currentTrackName = null;
        });

        this.currentAudio = audio;
        return audio;
    }

    /**
     * Stop the currently playing track.
     */
    public stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            this.currentTrackName = null;
        }
    }


    /**
     * Play a sequence of tracks. Useful for "Level Up" then "Gym Win".
     * @param names Array of track names to play in order
     * @param lastLoop Whether the last track should loop
     */
    public async playSequence(names: string[], lastLoop: boolean = true): Promise<void> {
        this.stop();

        for (let i = 0; i < names.length; i++) {
            const isLast = i === names.length - 1;
            const name = names[i];

            if (isLast && lastLoop) {
                // For the last track in a looping sequence, use play() directly
                // so it sets loop=true before starting.
                this.play(name, true);
                return;
            } else {
                // Otherwise play it once and wait for it to finish
                await this.playOneShot(name);
            }
        }
    }

    /**
     * Internal helper to play a track once and resolve when finished.
     */
    private playOneShot(name: string): Promise<HTMLAudioElement> {
        return new Promise((resolve) => {
            this.stop();

            let audio = this.audioCache.get(name);
            if (!audio) {
                audio = new Audio(`${this.musicPath}${name}.OGG`);
                this.audioCache.set(name, audio);
            }

            audio.loop = false;
            audio.muted = this.muted;
            audio.volume = this.defaultVolume;
            audio.currentTime = 0;

            const onFinished = () => {
                audio.removeEventListener('ended', onFinished);
                audio.removeEventListener('pause', onFinished);
                resolve(audio);
            };

            audio.addEventListener('ended', onFinished);
            audio.addEventListener('pause', onFinished);

            audio.play().catch(e => {
                console.warn(`One-shot music play failed for ${name}:`, e);
                onFinished();
            });

            this.currentAudio = audio;
            this.currentTrackName = name;
        });
    }

    /**
     * Special method for the level up sequence.
     */
    public async playLevelUpSequence(mainTrack: string): Promise<void> {
        await this.playOneShot('level up');
        this.play(mainTrack, true);
    }

    /**
     * Special method for the recover sequence.
     */
    public async playRecoverSequence(mainTrack: string): Promise<void> {
        await this.playOneShot('recover');
        this.play(mainTrack, true);
    }
}

export const music = MusicManager.getInstance();
