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
