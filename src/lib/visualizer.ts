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
        const maxBarH = elH * (options.heightScale ?? 0.72);
        const minBarH = Math.max((options.baseline ?? 4) * scale, elH * 0.04);
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
            const reactive = Math.min(1, Math.max(0, v * 0.82 + motion * 0.18));
            const barH = minBarH + Math.pow(reactive, 1.45) * maxBarH * edgeFade;
            const x = i * (barW + gap);
            const y = centerY - barH / 2;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barH, barW / 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (type === 'ai-orb') {
        const radius = Math.min(elW, elH) / 4 * (1 + v * 1.5);
        const gradient = ctx.createRadialGradient(elW/2, elH/2, 0, elW/2, elH/2, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(elW / 2, elH / 2, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
    } else if (type === 'siri-wave') {
        const centerY = elH / 2;
        const width = elW;
        // The Siri iOS 9 colors
        const colors = [
            'rgba(32, 133, 252, 0.8)', // blue
            'rgba(94, 252, 169, 0.8)', // green
            'rgba(253, 71, 103, 0.8)', // red
            'rgba(252, 237, 72, 0.8)', // yellow
            'rgba(255, 255, 255, 0.6)' // white
        ];
        
        ctx.globalCompositeOperation = 'screen';
        
        for (let i = 0; i < colors.length; i++) {
            ctx.beginPath();
            ctx.strokeStyle = colors[i];
            ctx.lineWidth = (i === colors.length - 1 ? 2 : 4) * scale;
            
            // varying speeds for each color band
            const speed = frame * 0.05 * (1 + (i * 0.2));
            const phase = i * 2; 
            const baseAmplitude = (elH * 0.4) * (0.3 + v * 0.7); 
            
            for (let x = 0; x <= width; x += 2 * scale) {
                const normalizedX = x / width; 
                // bell curve attenuation (max in center, 0 at ends)
                const attenuation = Math.pow(Math.sin(normalizedX * Math.PI), 2);
                
                // sine wave
                const y = centerY + Math.sin(normalizedX * Math.PI * 4 + speed + phase) * baseAmplitude * attenuation * (i % 2 === 0 ? 1 : -1);
                
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        
    } else if (type === 'ai-blob') {
        // ... (we'll keep ai-blob but let's improve it)
        const numPoints = 120;
        const baseRadius = Math.min(elW, elH) / 4;
        const centerX = elW / 2;
        const centerY = elH / 2;
        
        ctx.beginPath();
        const blobGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * (2 + v));
        blobGradient.addColorStop(0, color);
        blobGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = blobGradient;
        
        ctx.globalAlpha = 0.8 + v * 0.2;
        
        let targetX = centerX;
        let targetY = centerY;
        
        for (let i = 0; i <= numPoints; i++) {
            const idx = i % numPoints;
            const angle = (idx / numPoints) * Math.PI * 2;
            
            // multi-frequency noise to simulate organic blob
            const noise = (Math.sin(idx * 0.4 + frame * 0.1) * 0.4 + Math.cos(idx * 0.8 + frame * 0.05) * 0.2) * (0.5 + v * 1.5);
            const reactiveRadius = baseRadius + (noise * baseRadius);
            
            const x = centerX + Math.cos(angle) * reactiveRadius;
            const y = centerY + Math.sin(angle) * reactiveRadius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
                targetX = x;
                targetY = y;
            }
            else ctx.lineTo(x, y);
        }
        ctx.lineTo(targetX, targetY);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;

    } else if (type.startsWith('elevenlabs')) {
        const centerX = elW / 2;
        const centerY = elH / 2;
        const radius = Math.min(elW, elH) / 3 * scale * (1 + v * 0.05);
        
        let baseColor = '#CADCFC';
        let shadowColor = 'rgba(20, 30, 50, FORMAT_ALPHA)';
        
        if (type === 'elevenlabs-v2') {
            baseColor = '#F6E7D8';
            shadowColor = 'rgba(60, 40, 20, FORMAT_ALPHA)';
        } else if (type === 'elevenlabs-v3') {
            baseColor = '#E5E7EB';
            shadowColor = 'rgba(20, 20, 25, FORMAT_ALPHA)';
        }
        
        ctx.save();
        ctx.beginPath();
        const points = 120;
        const wobbleIntensity = 0.02 + Math.pow(v, 1.5) * 0.3;
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const noiseVal = 
                Math.sin(angle * 3 + frame * 0.05) * 0.5 + 
                Math.cos(angle * 5 - frame * 0.08) * 0.3 +
                Math.sin(angle * 7 + frame * 0.1) * 0.2 * (v > 0.1 ? 1 : 0);
                
            const r = radius * (1 + noiseVal * wobbleIntensity);
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.clip();
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(centerX - radius*2, centerY - radius*2, radius * 4, radius * 4);
        
        ctx.globalCompositeOperation = 'multiply';
        for (let i = 0; i < 3; i++) {
            const time = frame * 0.02 * (1 + v * 0.5);
            const ox = Math.cos(time * 0.8 + i * 2.5) * radius * 0.5;
            const oy = Math.sin(time * 0.6 + i * 3.1) * radius * 0.5;
            const size = radius * (1.2 + v * 0.4);
            
            const g = ctx.createRadialGradient(centerX + ox, centerY + oy, 0, centerX + ox, centerY + oy, size);
            g.addColorStop(0, shadowColor.replace('FORMAT_ALPHA', String(0.6 + v * 0.3)));
            g.addColorStop(0.8, shadowColor.replace('FORMAT_ALPHA', '0'));
            
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(centerX + ox, centerY + oy, size, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Inner depth tint
        const depthTone = type === 'elevenlabs-v1' ? 'rgba(160, 185, 209, FORMAT_ALPHA)' :
                          type === 'elevenlabs-v2' ? 'rgba(224, 207, 194, FORMAT_ALPHA)' :
                          'rgba(156, 163, 175, FORMAT_ALPHA)';
        
        ctx.globalCompositeOperation = 'multiply';
        const depthGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.2);
        depthGrad.addColorStop(0, 'rgba(0,0,0,0)');
        depthGrad.addColorStop(1, depthTone.replace('FORMAT_ALPHA', '0.8'));
        ctx.fillStyle = depthGrad;
        ctx.fillRect(centerX - radius*2, centerY - radius*2, radius * 4, radius * 4);

        // Highlight pass
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 3; i++) {
            const time = frame * 0.03 * (1 + v * 0.8);
            const ox = Math.cos(time * 1.2 + i * 4.2) * radius * 0.6;
            const oy = Math.sin(time * 1.1 + i * 1.7) * radius * 0.6;
            
            const size = radius * (0.8 + Math.sin(time + i) * 0.2); 
            
            const g = ctx.createRadialGradient(centerX + ox, centerY + oy, 0, centerX + ox, centerY + oy, size);
            g.addColorStop(0, `rgba(255,255,255,${0.6 + v * 0.4})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(centerX + ox, centerY + oy, size, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.globalCompositeOperation = 'multiply';
        const edge = ctx.createRadialGradient(centerX, centerY, radius * 0.6, centerX, centerY, radius * 1.2);
        edge.addColorStop(0, 'rgba(0,0,0,0)');
        edge.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = edge;
        ctx.fillRect(centerX - radius*2, centerY - radius*2, radius * 4, radius * 4);

        ctx.globalCompositeOperation = 'screen';
        const specX = centerX - radius * 0.3;
        const specY = centerY - radius * 0.3;
        const specular = ctx.createRadialGradient(specX, specY, 0, specX, specY, radius * 0.8);
        specular.addColorStop(0, 'rgba(255,255,255,0.3)');
        specular.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = specular;
        ctx.fillRect(centerX - radius*2, centerY - radius*2, radius * 4, radius * 4);

        ctx.restore();
        
        ctx.globalAlpha = 1.0;

    } else if (type === 'chatgpt-orb') {
        const centerX = elW / 2;
        const centerY = elH / 2;
        // ChatGPT orb is a soft, shifting monochrome light (or custom color) with sharp inner ring
        const baseRadius = Math.min(elW, elH) / 5;
        
        const wobble = Math.sin(frame * 0.1) * v * 0.1;
        const coreRadius = baseRadius * (1 + v * 0.3 + wobble);
        
        // Background diffuse glow
        const glow = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.5, centerX, centerY, coreRadius * 3);
        glow.addColorStop(0, color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.3 + v * 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius * 3, 0, 2 * Math.PI);
        ctx.fill();

        // Complex shifting rings
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.8 + v * 0.2;
        for (let i = 0; i < 4; i++) {
            const angleOffset = frame * 0.05 + i * (Math.PI / 2);
            const wx = Math.cos(angleOffset) * (baseRadius * 0.2 * v);
            const wy = Math.sin(angleOffset) * (baseRadius * 0.2 * v);
            
            ctx.beginPath();
            ctx.arc(centerX + wx, centerY + wy, coreRadius * (1 + i * 0.05), Math.PI * 0.2, Math.PI * 1.8);
            ctx.lineCap = 'round';
            ctx.lineWidth = (3 - i * 0.5) * scale;
            ctx.strokeStyle = color !== '#00ffcc' ? '#ffffff' : color;
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }
}
