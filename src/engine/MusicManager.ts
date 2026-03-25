/**
 * MusicManager handles all background music and sound effects logic.
 * Integrated with Web Audio API for low-latency playback and better caching.
 */
class MusicManager {
    private static instance: MusicManager;
    private context: AudioContext | null = null;
    
    // Web Audio Source (for SFX)
    private currentSource: AudioBufferSourceNode | null = null;
    // HTML5 Audio Source (for BGM streaming)
    private bgmElement: HTMLAudioElement | null = null;
    private bgmMediaSource: MediaElementAudioSourceNode | null = null;
    
    private currentGainNode: GainNode | null = null;
    private currentTrackName: string | null = null;
    
    private musicPath: string = 'music/';
    private muted: boolean = false;
    private defaultVolume: number = 0.15;

    private bufferCache: Map<string, AudioBuffer> = new Map();
    private decodedPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

    // Define which tracks should be pre-decoded for low latency (SFX)
    private readonly sfxTracks = ['level up', 'recover'];

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
     * Preload multiple tracks.
     * SFX tracks are fully decoded. BGM tracks are just "warmed up" via browser cache.
     */
    public async preload(names: string[]): Promise<void> {
        const loadTrack = async (name: string): Promise<any> => {
            // Only decode if it's an SFX track
            if (this.sfxTracks.includes(name)) {
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
                        console.warn(`Failed to preload SFX: ${name}`, e);
                        return null;
                    } finally {
                        this.decodedPromises.delete(name);
                    }
                })();

                this.decodedPromises.set(name, promise);
                return promise;
            } else {
                // For BGM, we just use the browser's native prefetch if possible
                // but since we want to avoid blocking the loader, we'll just return immediately
                // The browser will handle caching when fetch is called.
                return Promise.resolve();
            }
        };

        await Promise.allSettled(names.map(name => loadTrack(name)));
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.currentGainNode) {
            const ctx = this.context;
            if (ctx) {
                this.currentGainNode.gain.setTargetAtTime(muted ? 0 : this.defaultVolume, ctx.currentTime, 0.1);
            }
        }
        if (this.bgmElement) {
            // Also mute the element itself just in case, though gain node should handle it
            this.bgmElement.muted = muted;
        }
    }

    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Play a single track. Automatically chooses between streaming (BGM) and buffer (SFX).
     */
    public async play(name: string, loop: boolean = true): Promise<void> {
        if (this.currentTrackName === name && (this.currentSource || (this.bgmElement && !this.bgmElement.paused))) {
            return;
        }

        this.stop();
        const ctx = this.initContext();
        
        try {
            if (this.sfxTracks.includes(name)) {
                // Use AudioBufferSourceNode for SFX
                let buffer = this.bufferCache.get(name);
                if (!buffer) {
                    await this.preload([name]);
                    buffer = this.bufferCache.get(name);
                }
                if (!buffer) return;

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
            } else {
                // Use HTML5 Audio streaming for BGM
                if (!this.bgmElement) {
                    this.bgmElement = new Audio();
                    this.bgmElement.crossOrigin = "anonymous";
                }
                
                this.bgmElement.src = `${this.musicPath}${name}.OGG`;
                this.bgmElement.loop = loop;
                this.bgmElement.muted = this.muted;
                
                if (!this.bgmMediaSource) {
                    this.bgmMediaSource = ctx.createMediaElementSource(this.bgmElement);
                }
                
                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(this.muted ? 0 : this.defaultVolume, ctx.currentTime);
                
                this.bgmMediaSource.connect(gainNode);
                gainNode.connect(ctx.destination);

                await this.bgmElement.play();
                this.currentGainNode = gainNode;
            }

            this.currentTrackName = name;
        } catch (e) {
            console.error(`Error playing music ${name}:`, e);
        }
    }

    /**
     * Stop the currently playing track.
     */
    public stop(): void {
        this.currentTrackName = null;
        
        // Stop SFX Source
        if (this.currentSource) {
            try {
                if (this.currentGainNode && this.context) {
                    this.currentGainNode.gain.setTargetAtTime(0, this.context.currentTime, 0.015);
                }
                const src = this.currentSource;
                setTimeout(() => {
                    try { src.stop(); } catch(e) {}
                }, 50);
            } catch (e) {}
            this.currentSource = null;
        }

        // Stop BGM Element
        if (this.bgmElement) {
            try {
                if (this.currentGainNode && this.context) {
                    this.currentGainNode.gain.setTargetAtTime(0, this.context.currentTime, 0.015);
                }
                const el = this.bgmElement;
                setTimeout(() => {
                    el.pause();
                    el.currentTime = 0;
                }, 50);
            } catch (e) {}
        }
        
        // Note: we don't null bgmElement/bgmMediaSource to reuse them
        this.currentGainNode = null;
    }

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

    public async playOneShot(name: string): Promise<void> {
        this.stop();
        const ctx = this.initContext();

        try {
            if (this.sfxTracks.includes(name)) {
                let buffer = this.bufferCache.get(name);
                if (!buffer) {
                    await this.preload([name]);
                    buffer = this.bufferCache.get(name);
                }
                if (!buffer) return;

                return new Promise((resolve) => {
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
            } else {
                // One-shot for BGM (rare but supported)
                if (!this.bgmElement) {
                    this.bgmElement = new Audio();
                    this.bgmElement.crossOrigin = "anonymous";
                }
                this.bgmElement.src = `${this.musicPath}${name}.OGG`;
                this.bgmElement.loop = false;
                
                if (!this.bgmMediaSource) {
                    this.bgmMediaSource = ctx.createMediaElementSource(this.bgmElement);
                }
                
                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(this.muted ? 0 : this.defaultVolume, ctx.currentTime);
                this.bgmMediaSource.connect(gainNode);
                gainNode.connect(ctx.destination);

                return new Promise((resolve) => {
                    const onEnded = () => {
                        this.bgmElement?.removeEventListener('ended', onEnded);
                        resolve();
                    };
                    this.bgmElement?.addEventListener('ended', onEnded);
                    this.bgmElement?.play();
                    this.currentGainNode = gainNode;
                    this.currentTrackName = name;
                });
            }
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
