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

    private musicPath: string = (import.meta.env.BASE_URL || './').endsWith('/')
        ? (import.meta.env.BASE_URL || './') + 'music/'
        : (import.meta.env.BASE_URL || './') + '/music/';
    private muted: boolean = false;
    private defaultVolume: number = 0.15;

    private bufferCache: Map<string, AudioBuffer> = new Map();
    private decodedPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

    // Trace the latest play request to avoid async race conditions
    private lastRequestId: number = 0;

    // Define which tracks should be pre-decoded for low latency (SFX)
    private readonly sfxTracks = ['level up', 'recover'];

    private constructor() {
        // AudioContext is initialized on first user interaction
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
        this.resumeContext();
        return this.context;
    }

    public async resumeContext(): Promise<void> {
        if (this.context && this.context.state === 'suspended') {
            try {
                await this.context.resume();
            } catch (e) { }
        }

        // If we have a track that should be playing but isn't, try to play it now
        if (this.currentTrackName && this.bgmElement && this.bgmElement.paused) {
            this.bgmElement.play().catch(() => { });
        }
    }

    public async preload(names: string[]): Promise<void> {
        const loadTrack = async (name: string): Promise<any> => {
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
            }
            return Promise.resolve();
        };

        await Promise.allSettled(names.map(name => loadTrack(name)));
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.currentGainNode && this.context) {
            this.currentGainNode.gain.setTargetAtTime(muted ? 0 : this.defaultVolume, this.context.currentTime, 0.1);
        }
        if (this.bgmElement) {
            this.bgmElement.muted = muted;
        }
    }

    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Play a single track. Automatically chooses between streaming (BGM) and buffer (SFX).
     */
    public async play(name: string, loop: boolean = true, requestId?: number): Promise<void> {
        if (this.currentTrackName === name && (this.currentSource || (this.bgmElement && !this.bgmElement.paused))) {
            return;
        }

        // Only stop if this is a fresh request or from a different sequence
        if (!requestId || requestId !== this.lastRequestId) {
            this.stop();
        }

        const currentId = requestId || this.lastRequestId;
        const ctx = this.initContext();

        try {
            if (this.sfxTracks.includes(name)) {
                let buffer = this.bufferCache.get(name);
                if (!buffer) {
                    await this.preload([name]);
                    // Check for interruption
                    if (currentId !== this.lastRequestId) return;
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
                if (!this.bgmElement) {
                    this.bgmElement = new Audio();
                    this.bgmElement.crossOrigin = "anonymous";
                }

                this.bgmElement.pause();
                this.bgmElement.src = `${this.musicPath}${name}.OGG`;
                this.bgmElement.loop = loop;
                this.bgmElement.muted = this.muted;
                this.bgmElement.currentTime = 0;

                if (!this.bgmMediaSource) {
                    this.bgmMediaSource = ctx.createMediaElementSource(this.bgmElement);
                }

                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(this.muted ? 0 : this.defaultVolume, ctx.currentTime);

                this.bgmMediaSource.disconnect();
                this.bgmMediaSource.connect(gainNode);
                gainNode.connect(ctx.destination);

                await this.bgmElement.play();
                if (currentId !== this.lastRequestId) {
                    this.bgmElement.pause();
                    return;
                }
                this.currentGainNode = gainNode;
            }

            this.currentTrackName = name;
        } catch (e) {
            console.error(`Error playing music ${name}:`, e);
        }
    }

    /**
     * Stop the currently playing track immediately.
     */
    public stop(): void {
        this.currentTrackName = null;
        this.lastRequestId++; // Invalidate pending play calls

        // Stop SFX Source
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (e) { }
            this.currentSource = null;
        }

        // Stop BGM Element
        if (this.bgmElement) {
            try {
                this.bgmElement.pause();
                this.bgmElement.currentTime = 0;
            } catch (e) { }
        }

        // Cleanup Gain Nodes
        if (this.currentGainNode) {
            try {
                this.currentGainNode.disconnect();
            } catch (e) { }
            this.currentGainNode = null;
        }

        if (this.bgmMediaSource) {
            try {
                this.bgmMediaSource.disconnect();
            } catch (e) { }
        }
    }

    public async playSequence(names: string[], lastLoop: boolean = true): Promise<void> {
        const sequenceId = ++this.lastRequestId;
        for (let i = 0; i < names.length; i++) {
            if (sequenceId !== this.lastRequestId) return;
            const isLast = i === names.length - 1;
            const name = names[i];

            if (isLast && lastLoop) {
                await this.play(name, true, sequenceId);
            } else {
                await this.playOneShot(name, sequenceId);
            }
        }
    }

    public async playOneShot(name: string, requestId?: number): Promise<void> {
        if (!requestId || requestId !== this.lastRequestId) {
            this.stop();
        }

        const currentId = requestId || this.lastRequestId;
        const ctx = this.initContext();

        try {
            if (this.sfxTracks.includes(name)) {
                let buffer = this.bufferCache.get(name);
                if (!buffer) {
                    await this.preload([name]);
                    if (currentId !== this.lastRequestId) return;
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
                            gainNode.disconnect();
                        }
                        resolve();
                    };

                    source.start(0);
                    this.currentSource = source;
                    this.currentGainNode = gainNode;
                    this.currentTrackName = name;
                });
            } else {
                if (!this.bgmElement) {
                    this.bgmElement = new Audio();
                    this.bgmElement.crossOrigin = "anonymous";
                }
                this.bgmElement.pause();
                this.bgmElement.src = `${this.musicPath}${name}.OGG`;
                this.bgmElement.loop = false;
                this.bgmElement.currentTime = 0;

                if (!this.bgmMediaSource) {
                    this.bgmMediaSource = ctx.createMediaElementSource(this.bgmElement);
                }

                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(this.muted ? 0 : this.defaultVolume, ctx.currentTime);
                this.bgmMediaSource.disconnect();
                this.bgmMediaSource.connect(gainNode);
                gainNode.connect(ctx.destination);

                return new Promise((resolve) => {
                    const onEnded = () => {
                        this.bgmElement?.removeEventListener('ended', onEnded);
                        gainNode.disconnect();
                        resolve();
                    };
                    this.bgmElement?.addEventListener('ended', onEnded);
                    this.bgmElement?.play().then(() => {
                        if (currentId !== this.lastRequestId) {
                            this.bgmElement?.pause();
                        }
                    });
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
        await this.play(mainTrack, true);
    }

    public async playRecoverSequence(mainTrack: string): Promise<void> {
        await this.playOneShot('recover');
        await this.play(mainTrack, true);
    }
}

export const music = MusicManager.getInstance();
