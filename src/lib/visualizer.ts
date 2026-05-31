export const compressVisualizerValue = (value: number) => {
    const threshold = 0.64;
    if (value <= threshold) return Math.max(0, value);
    const compressed = threshold + (1 - threshold) * (1 - Math.exp(-(value - threshold) * 1.7));
    return Math.min(compressed, 0.96);
};

export type VisualizerType = 'bars-bottom' | 'bars-center' | 'waveform-strip';

export type VisualizerBarFrame = {
    height: number;
    opacity: number;
    color: string;
};

export type VisualizerCurve = 'default' | 'linear' | 'sqrt' | 'log';
export type VisualizerBandFocus = 'full' | 'voice' | 'low' | 'high';

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const compressWithRatio = (value: number, ratio: number) => {
    const safeRatio = Math.max(1, ratio || 1);
    if (safeRatio <= 1.01) return value;
    const threshold = 0.42;
    if (value <= threshold) return value;
    const over = value - threshold;
    const softened = threshold + over / safeRatio;
    return threshold + (softened - threshold) * 0.72 + (1 - Math.exp(-over * 2.4)) * 0.08;
};

const applyVisualizerCurve = (value: number, curve: VisualizerCurve, type: VisualizerType) => {
    const safeValue = clamp01(value);
    if (curve === 'linear') return safeValue;
    if (curve === 'sqrt') return Math.sqrt(safeValue);
    if (curve === 'log') return Math.log1p(safeValue * 9) / Math.log1p(9);
    return Math.pow(safeValue, type === 'waveform-strip' ? 1.05 : 1.5);
};

const applySignalTuning = (
    value: number,
    {
        gain = 1,
        compression = 1,
        floor = 0,
        ceiling = 1,
    }: {
        gain?: number;
        compression?: number;
        floor?: number;
        ceiling?: number;
    },
) => {
    const gained = clamp01(value * Math.max(0, gain || 1));
    const compressed = compressWithRatio(gained, compression || 1);
    const capped = Math.min(Math.max(0.02, ceiling || 1), compressed);
    return Math.max(Math.min(0.95, Math.max(0, floor || 0)), capped);
};

const getBandFocusRange = (focus: VisualizerBandFocus) => {
    if (focus === 'voice') return { start: 0.16, end: 0.78 };
    if (focus === 'low') return { start: 0, end: 0.38 };
    if (focus === 'high') return { start: 0.56, end: 1 };
    return { start: 0, end: 1 };
};

export const normalizeVisualizerType = (type?: string | null): VisualizerType => {
    if (type === 'bars-bottom' || type === 'bars-center' || type === 'waveform-strip') return type;
    return 'bars-center';
};

export const getVisualizerBarCount = (type: VisualizerType, requested?: number | null) => (
    requested || (type === 'waveform-strip' ? 72 : 16)
);

export const getVisualizerBars = ({
    type,
    count,
    frame,
    height,
    scale = 1,
    audioLevel,
    frequencyBands,
    currentSpeaker,
    splitSpeakers = false,
    mirror = false,
    sensitivity = 1.5,
    heightScale = 0.9,
    baseline = 4,
    gain = 1,
    compression = 1,
    floor = 0,
    ceiling = 1,
    curve = 'default',
    bandFocus = 'full',
    color = '#00ffcc',
    speaker2Color = '#8b5cf6',
}: {
    type: VisualizerType;
    count: number;
    frame: number;
    height: number;
    scale?: number;
    audioLevel?: number | null;
    frequencyBands?: number[] | null;
    currentSpeaker?: number | null;
    splitSpeakers?: boolean;
    mirror?: boolean;
    sensitivity?: number;
    heightScale?: number;
    baseline?: number;
    gain?: number;
    compression?: number;
    floor?: number;
    ceiling?: number;
    curve?: VisualizerCurve;
    bandFocus?: VisualizerBandFocus;
    color?: string;
    speaker2Color?: string;
}): VisualizerBarFrame[] => {
    const safeHeight = Math.max(1, height);
    const safeCount = Math.max(1, count);
    const halfCount = Math.floor(safeCount / 2);
    const center = (safeCount - 1) / 2;
    const hasLevel = typeof audioLevel === 'number' && Number.isFinite(audioLevel) && audioLevel > 0.012;

    return Array.from({ length: safeCount }).map((_, index) => {
        const isLeftSpeakerSide = index < halfCount;
        const sideIndex = isLeftSpeakerSide ? index : index - halfCount;
        const sideTotal = isLeftSpeakerSide ? halfCount : safeCount - halfCount;
        const speakerActive = !splitSpeakers || !currentSpeaker || (currentSpeaker === 1 ? isLeftSpeakerSide : !isLeftSpeakerSide);
        const sampleIndex = mirror && !splitSpeakers ? Math.min(index, safeCount - 1 - index) : index;
        const centerDistance = Math.abs(sampleIndex - center);
        const normalized = splitSpeakers
            ? sideIndex / Math.max(1, sideTotal - 1)
            : type === 'bars-center'
                ? centerDistance / Math.max(1, center)
                : sampleIndex / Math.max(1, safeCount - 1);
        const edgeFade = type === 'waveform-strip'
            ? 0.45 + Math.pow(Math.sin(normalized * Math.PI), 0.7) * 0.55
            : 1;
        const fallbackMotion = Math.min(1, Math.max(0, (
            Math.sin(frame * 0.2 + index) * 0.5 +
            Math.sin(frame * 0.09 + index * 1.73) * 0.3 +
            Math.sin(frame * 0.31 + index * 0.41) * 0.2 +
            0.5
        )));
        const focusRange = getBandFocusRange(bandFocus);
        const focusedNormalized = focusRange.start + normalized * (focusRange.end - focusRange.start);
        const bandIndex = frequencyBands?.length
            ? Math.min(frequencyBands.length - 1, Math.max(0, 1 + Math.floor(focusedNormalized * (frequencyBands.length - 2))))
            : -1;
        const bandSignal = bandIndex >= 0 ? frequencyBands?.[bandIndex] ?? null : null;
        const baseSignal = bandSignal ?? (hasLevel ? audioLevel ?? 0 : fallbackMotion * 0.55);
        const tunedSignal = applySignalTuning(baseSignal, { gain, compression, floor, ceiling });
        const compressed = compressVisualizerValue(tunedSignal * sensitivity);
        const decorativeMotion = hasLevel || bandSignal !== null ? 0.08 : 0.24;
        const motionSignal = type === 'waveform-strip'
            ? compressVisualizerValue((compressed * 1.1) + (fallbackMotion * decorativeMotion))
            : compressed;
        const powered = applyVisualizerCurve(motionSignal, curve, type);
        const minHeight = type === 'waveform-strip'
            ? Math.max(baseline * scale, safeHeight * 0.04)
            : baseline * scale;
        const barHeight = speakerActive
            ? Math.min(safeHeight, minHeight + powered * safeHeight * heightScale * edgeFade)
            : minHeight + 0.04 * safeHeight * heightScale * edgeFade;

        return {
            height: barHeight,
            opacity: speakerActive ? 0.95 : 0.28,
            color: splitSpeakers && !isLeftSpeakerSide ? speaker2Color : color,
        };
    });
};

export function drawAdvancedVisualizer(
    ctx: CanvasRenderingContext2D,
    type: string,
    elW: number,
    elH: number,
    v: number,
    frame: number,
    color: string,
    scale: number = 1,
    options: { barCount?: number; heightScale?: number; baseline?: number } = {}
) {
    if (type === 'waveform-strip') {
        const count = options.barCount || 72;
        const gap = 2.2 * scale;
        const barW = Math.max(1.5 * scale, (elW - gap * (count - 1)) / count);
        const centerY = elH / 2;
        const maxBarH = elH * (options.heightScale ?? 0.9);
        const minBarH = Math.max((options.baseline ?? 4) * scale, elH * 0.08);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.92;
        for (let i = 0; i < count; i++) {
            const normalized = i / Math.max(1, count - 1);
            const edgeFade = 0.45 + Math.pow(Math.sin(normalized * Math.PI), 0.7) * 0.55;
            const motion = (
                Math.sin(frame * 0.18 + i * 0.72) * 0.45 +
                Math.sin(frame * 0.07 + i * 1.91) * 0.25 +
                0.5
            );
            const reactive = Math.min(1, Math.max(0, v * 1.1 + motion * 0.24));
            const barH = minBarH + Math.pow(reactive, 1.05) * maxBarH * edgeFade;
            const x = i * (barW + gap);
            const y = centerY - barH / 2;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barH, barW / 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
