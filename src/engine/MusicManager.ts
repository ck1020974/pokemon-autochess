/**
 * MusicManager handles all background music and sound effects logic.
 * Integrated with Web Audio API for low-latency playback and better caching.
 */
class MusicManager {
    private static instance: MusicManager;
    private context: AudioContext | null = null;
    private currentSource: AudioBufferSourceNode | null = null;
    private currentGainNode: GainNode | null = null;
    private currentTrackName: string | null = null;
    
    private musicPath: string = 'music/';
    private muted: boolean = false;
    private defaultVolume: number = 0.15;

    private bufferCache: Map<string, AudioBuffer> = new Map();
    private decodedPromises: Map<string, Promise<AudioBuffer>> = new Map();

    private constructor() {
        // AudioContext is initialized on first user interaction to satisfy browser policies
    }

    public static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            MusicManager.instance = new MusicManager();
        }
        return MusicManager.instance;
    }

    private initContext() {
        if (!this.context) {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        return this.context;
    }

    /**
     * Preload multiple tracks into the cache and wait for them to be ready.
     * Uses fetch and decodeAudioData for optimal performance.
     */
    public async preload(names: string[]): Promise<void> {
        const loadTrack = async (name: string): Promise<AudioBuffer> => {
            if (this.bufferCache.has(name)) return this.bufferCache.get(name)!;
            if (this.decodedPromises.has(name)) return this.decodedPromises.get(name)!;

            const promise = (async () => {
                try {
                    const response = await fetch(`${this.musicPath}${name}.OGG`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const ctx = this.initContext();
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    this.bufferCache.set(name, audioBuffer);
                    return audioBuffer;
                } catch (e) {
                    console.warn(`Failed to preload music: ${name}`, e);
                    throw e;
                } finally {
                    this.decodedPromises.delete(name);
                }
            })();

            this.decodedPromises.set(name, promise);
            return promise;
        };

        await Promise.allSettled(names.map(name => loadTrack(name)));
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.currentGainNode) {
            this.currentGainNode.gain.setTargetAtTime(muted ? 0 : this.defaultVolume, this.context?.currentTime || 0, 0.1);
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
    public async play(name: string, loop: boolean = true): Promise<void> {
        if (this.currentTrackName === name && this.currentSource) {
            return;
        }

        this.stop();
        this.initContext();
        
        try {
            let buffer = this.bufferCache.get(name);
            if (!buffer) {
                await this.preload([name]);
                buffer = this.bufferCache.get(name);
            }

            if (!buffer) return;

            const ctx = this.context!;
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();

            source.buffer = buffer;
            source.loop = loop;
            
            gainNode.gain.setValueAtTime(this.muted ? 0 : this.defaultVolume, ctx.currentTime);
            
            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            source.start(0);

            this.currentSource = source;
            this.currentGainNode = gainNode;
            this.currentTrackName = name;
        } catch (e) {
            console.error(`Error playing music ${name}:`, e);
        }
    }

    /**
     * Stop the currently playing track with a short fade-out to prevent clicks.
     */
    public stop(): void {
        if (this.currentSource) {
            try {
                // Short fade out (50ms)
                if (this.currentGainNode && this.context) {
                    this.currentGainNode.gain.setTargetAtTime(0, this.context.currentTime, 0.015);
                }
                const src = this.currentSource;
                setTimeout(() => {
                    try { src.stop(); } catch(e) {}
                }, 50);
            } catch (e) {
                console.warn("Stop error:", e);
            }
            this.currentSource = null;
            this.currentGainNode = null;
            this.currentTrackName = null;
        }
    }

    /**
     * Play a sequence of tracks.
     */
    public async playSequence(names: string[], lastLoop: boolean = true): Promise<void> {
        for (let i = 0; i < names.length; i++) {
            const isLast = i === names.length - 1;
            const name = names[i];

            if (isLast && lastLoop) {
                await this.play(name, true);
            } else {
                await this.playOneShot(name);
            }
        }
    }

    /**
     * Internal helper to play a track once and resolve when finished.
     */
    public async playOneShot(name: string): Promise<void> {
        this.stop();
        this.initContext();

        try {
            let buffer = this.bufferCache.get(name);
            if (!buffer) {
                await this.preload([name]);
                buffer = this.bufferCache.get(name);
            }
            if (!buffer) return;

            return new Promise((resolve) => {
                const ctx = this.context!;
                const source = ctx.createBufferSource();
                const gainNode = ctx.createGain();

                source.buffer = buffer!;
                gainNode.gain.setValueAtTime(this.muted ? 0 : this.defaultVolume, ctx.currentTime);

                source.connect(gainNode);
                gainNode.connect(ctx.destination);

                source.onended = () => {
                    if (this.currentSource === source) {
                        this.currentSource = null;
                        this.currentTrackName = null;
                    }
                    resolve();
                };

                source.start(0);
                this.currentSource = source;
                this.currentGainNode = gainNode;
                this.currentTrackName = name;
            });
        } catch (e) {
            console.error(`One-shot error ${name}:`, e);
        }
    }

    public async playLevelUpSequence(mainTrack: string): Promise<void> {
        await this.playOneShot('level up');
        this.play(mainTrack, true);
    }

    public async playRecoverSequence(mainTrack: string): Promise<void> {
        await this.playOneShot('recover');
        this.play(mainTrack, true);
    }
}

export const music = MusicManager.getInstance();
