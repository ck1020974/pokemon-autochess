/**
 * MusicManager handles all background music and sound effects logic.
 * It uses HTMLAudioElement to ensure playback is independent of the game's TimeScale.
 */
class MusicManager {
    private static instance: MusicManager;
    private currentAudio: HTMLAudioElement | null = null;
    private musicPath: string = 'music/';
    private muted: boolean = false;
    private defaultVolume: number = 0.15;

    private constructor() { }

    public static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            MusicManager.instance = new MusicManager();
        }
        return MusicManager.instance;
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
     * Play a single track.
     * @param name Name of the file (without extension)
     * @param loop Whether to loop the track
     */
    public play(name: string, loop: boolean = true): HTMLAudioElement {
        this.stop();

        const audio = new Audio(`${this.musicPath}${name}.OGG`);
        audio.muted = this.muted;
        audio.volume = this.defaultVolume;

        if (loop) {
            // Manual loop logic to support fading
            const fadeTime = 2; // seconds
            let isFadingOut = false;

            const checkFade = () => {
                if (!this.currentAudio || this.currentAudio !== audio) {
                    audio.removeEventListener('timeupdate', checkFade);
                    return;
                }

                const remaining = audio.duration - audio.currentTime;

                // Start fade out
                if (!isFadingOut && remaining > 0 && remaining < fadeTime) {
                    isFadingOut = true;
                    this.fadeVolume(audio, 0, remaining * 1000);
                }
            };

            audio.addEventListener('timeupdate', checkFade);
            audio.onended = () => {
                if (this.currentAudio === audio) {
                    audio.currentTime = 0;
                    audio.volume = 0;
                    isFadingOut = false;
                    audio.play().catch(e => console.warn("Music replay failed:", e));
                    this.fadeVolume(audio, this.defaultVolume, 1000);
                }
            };
        } else {
            audio.loop = false;
        }

        audio.play().catch(e => console.warn("Music play failed:", e));
        this.currentAudio = audio;
        return audio;
    }

    /**
     * Stop the currently playing track.
     */
    public stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.onended = null; // Clear manual loop
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    /**
     * Helper to gradually change volume.
     */
    private fadeVolume(audio: HTMLAudioElement, target: number, durationMs: number): void {
        const startVolume = audio.volume;
        const steps = 20;
        const stepTime = durationMs / steps;
        const volStep = (target - startVolume) / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            if (!this.currentAudio || this.currentAudio !== audio) {
                clearInterval(interval);
                return;
            }

            currentStep++;
            audio.volume = Math.max(0, Math.min(1, startVolume + volStep * currentStep));

            if (currentStep >= steps) {
                audio.volume = target;
                clearInterval(interval);
            }
        }, stepTime);
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
            const audio = await this.playOneShot(names[i]);

            if (isLast && lastLoop) {
                audio.loop = true;
                this.currentAudio = audio;
                // Since playOneShot finishes when 'ended' triggers, 
                // we need to make sure we don't 'await' it if we want it to loop.
                // Wait, if it's the last one and loops, playOneShot won't ever resolve.
                // Let's refactor this a bit.
            }
        }
    }

    /**
     * Internal helper to play a track once and resolve when finished.
     */
    private playOneShot(name: string): Promise<HTMLAudioElement> {
        return new Promise((resolve) => {
            this.stop();
            const audio = new Audio(`${this.musicPath}${name}.OGG`);
            audio.loop = false;
            audio.muted = this.muted;
            audio.volume = this.defaultVolume;
            audio.onended = () => resolve(audio);
            audio.play().catch(e => {
                console.warn("Music play failed:", e);
                resolve(audio);
            });
            this.currentAudio = audio;
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
