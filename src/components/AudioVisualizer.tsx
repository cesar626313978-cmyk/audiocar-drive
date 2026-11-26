import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

const BAR_COUNT = 56;
const FFT_BINS = 128;

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);

  // Persistent animation state across frames
  const barValuesRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const peakValuesRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const peakVelocitiesRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const freqBufferRef = useRef<Uint8Array>(new Uint8Array(FFT_BINS));
  const rafIdRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let logicalWidth = canvas.clientWidth || 520;
    let logicalHeight = canvas.clientHeight || 84;

    const updateCanvasResolution = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const rect = canvas.getBoundingClientRect();
      logicalWidth = Math.max(240, rect.width || 520);
      logicalHeight = Math.max(44, rect.height || 84);

      canvas.width = Math.round(logicalWidth * dpr);
      canvas.height = Math.round(logicalHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateCanvasResolution();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasResolution();
      if (!rafIdRef.current) {
        renderFrame();
      }
    });
    resizeObserver.observe(canvas);

    const drawCapsule = (x: number, y: number, w: number, h: number, radius: number) => {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
      ctx.fill();
    };

    const renderFrame = () => {
      if (document.hidden) {
        rafIdRef.current = null;
        return;
      }

      const activePlaying = isPlayingRef.current || audioEngine.isAudioPlaying();
      const bars = barValuesRef.current;
      const peaks = peakValuesRef.current;
      const peakVels = peakVelocitiesRef.current;
      const freqData = freqBufferRef.current;

      const hasRealAudioData = activePlaying && audioEngine.getFrequencyData(freqData);
      phaseRef.current += 0.048;
      const t = phaseRef.current;

      const halfCount = BAR_COUNT / 2; // 28 bars per side, mirrored from center
      let allSettledAtRest = true;

      for (let i = 0; i < BAR_COUNT; i++) {
        // Distance from center (0 = center bass, 1 = outer treble)
        const distFromCenter = Math.abs(i - (halfCount - 0.5)) / halfCount;
        let targetAmplitude = 0;

        if (activePlaying) {
          if (hasRealAudioData) {
            // Map frequency bins symmetrically: low bass in the center, mids & highs towards the edges
            const binIndex = Math.min(
              FFT_BINS - 1,
              Math.floor(Math.pow(distFromCenter, 1.15) * 48) + (i % 2)
            );
            const rawVal = freqData[binIndex] / 255;
            // Perceptual high-frequency lift so outer bars remain expressive
            const eqLift = 1 + distFromCenter * 0.65;
            // Subtle center envelope for automotive aesthetics
            const envelope = 1 - Math.pow(distFromCenter, 2.2) * 0.25;
            targetAmplitude = Math.min(1, Math.pow(rawVal * eqLift, 1.1) * envelope);
          } else {
            // Organic multi-harmonic fallback simulation when CORS blocks AnalyserNode or stream returns 0s
            const bassPulse =
              Math.pow(0.5 + 0.5 * Math.sin(t * 1.45), 2.2) * Math.exp(-distFromCenter * 2.4);
            const midWave =
              (0.5 + 0.5 * Math.sin(t * 2.3 - distFromCenter * 7.5 + (i % 3) * 0.35)) *
              (1 - distFromCenter * 0.35) *
              0.68;
            const highShimmer =
              (0.5 + 0.5 * Math.cos(t * 4.1 + i * 0.75)) * (0.25 + distFromCenter * 0.55) * 0.48;
            const microMod = 0.85 + 0.15 * Math.sin(t * 0.7 + i * 0.22);

            const envelope = 1 - Math.pow(distFromCenter, 1.85) * 0.42;
            targetAmplitude = Math.min(
              0.96,
              Math.max(0.06, (bassPulse * 0.65 + midWave * 0.55 + highShimmer * 0.4) * envelope * microMod)
            );
          }
        } else {
          targetAmplitude = 0;
        }

        // Fast attack, smooth decay physics
        const current = bars[i];
        if (targetAmplitude > current) {
          bars[i] = current + (targetAmplitude - current) * 0.38;
        } else {
          bars[i] = current + (targetAmplitude - current) * 0.14;
        }

        if (bars[i] < 0.002) {
          bars[i] = 0;
        } else {
          allSettledAtRest = false;
        }

        // Peak-hold cap gravity physics
        if (bars[i] >= peaks[i]) {
          peaks[i] = bars[i];
          peakVels[i] = 0;
        } else {
          peakVels[i] += 0.0012; // Smooth downward gravity acceleration
          peaks[i] = Math.max(0, peaks[i] - peakVels[i]);
        }

        if (peaks[i] > 0.004) {
          allSettledAtRest = false;
        } else {
          peaks[i] = 0;
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const isLightMode = !document.documentElement.classList.contains('dark') &&
        !canvas.closest('.dark');

      const centerY = logicalHeight / 2;
      const maxHalfHeight = Math.max(12, centerY - 6);
      const minHalfHeight = 2.2; // Resting line capsule radius

      // Calculate bar width and gap across 56 symmetric bars
      const horizontalPadding = 6;
      const availableWidth = logicalWidth - horizontalPadding * 2;
      const step = availableWidth / BAR_COUNT;
      const barWidth = Math.max(2.5, Math.min(6.5, step * 0.64));

      // Draw subtle center horizon line
      ctx.fillStyle = isLightMode ? 'rgba(59, 130, 246, 0.12)' : 'rgba(77, 168, 255, 0.10)';
      ctx.fillRect(horizontalPadding, centerY - 0.5, availableWidth, 1);

      // Build vertical symmetric luminous gradient (Cyan/Electric Blue #4DA8FF at peaks -> Deep Blue in center)
      const barGradient = ctx.createLinearGradient(0, centerY - maxHalfHeight, 0, centerY + maxHalfHeight);
      if (isLightMode) {
        barGradient.addColorStop(0, '#0284C7');
        barGradient.addColorStop(0.22, '#2563EB');
        barGradient.addColorStop(0.5, '#1E40AF');
        barGradient.addColorStop(0.78, '#2563EB');
        barGradient.addColorStop(1, '#0284C7');
      } else {
        barGradient.addColorStop(0, '#67E8F9');    // Luminous cyan tip
        barGradient.addColorStop(0.18, '#4DA8FF'); // Electric Tesla blue
        barGradient.addColorStop(0.5, '#1D4ED8');  // Deep royal blue core
        barGradient.addColorStop(0.82, '#4DA8FF'); // Electric Tesla blue
        barGradient.addColorStop(1, '#67E8F9');    // Luminous cyan bottom tip
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const amp = bars[i];
        const peakAmp = peaks[i];
        const x = horizontalPadding + i * step + (step - barWidth) / 2;

        const halfH = minHalfHeight + amp * (maxHalfHeight - minHalfHeight);
        const totalH = halfH * 2;
        const y = centerY - halfH;

        if (amp > 0.015) {
          ctx.fillStyle = barGradient;
          // Subtle glow on high crests
          if (amp > 0.45 && !isLightMode) {
            ctx.shadowColor = 'rgba(77, 168, 255, 0.55)';
            ctx.shadowBlur = 10 * amp;
          } else {
            ctx.shadowBlur = 0;
          }
          drawCapsule(x, y, barWidth, totalH, barWidth / 2);
        } else {
          // Resting state minimal capsule dot
          ctx.shadowBlur = 0;
          ctx.fillStyle = isLightMode ? 'rgba(37, 99, 235, 0.32)' : 'rgba(77, 168, 255, 0.32)';
          drawCapsule(x, centerY - minHalfHeight, barWidth, minHalfHeight * 2, barWidth / 2);
        }

        // Draw symmetric upper and lower peak-hold caps when above resting state
        if (peakAmp > 0.06) {
          ctx.shadowBlur = 0;
          const peakOffset = minHalfHeight + peakAmp * (maxHalfHeight - minHalfHeight) + 2.5;
          const capHeight = Math.min(2.6, barWidth * 0.65);
          const capAlpha = Math.min(0.95, 0.35 + peakAmp * 0.65);

          ctx.fillStyle = isLightMode
            ? `rgba(2, 132, 199, ${capAlpha})`
            : `rgba(125, 211, 252, ${capAlpha})`;

          // Top peak cap
          drawCapsule(
            x,
            Math.max(1, centerY - peakOffset - capHeight),
            barWidth,
            capHeight,
            capHeight / 2
          );

          // Bottom mirrored peak cap
          drawCapsule(
            x,
            Math.min(logicalHeight - capHeight - 1, centerY + peakOffset),
            barWidth,
            capHeight,
            capHeight / 2
          );
        }
      }

      ctx.shadowBlur = 0;

      // Stop requestAnimationFrame loop when paused and all bars have settled to resting line
      if (!activePlaying && allSettledAtRest) {
        rafIdRef.current = null;
        return;
      }

      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    const startLoopIfNeeded = () => {
      if (!document.hidden && !rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(renderFrame);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else {
        startLoopIfNeeded();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startLoopIfNeeded();

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div className="w-full max-w-[640px] px-2 mt-5 [@media(max-height:750px)]:mt-2.5 flex flex-col items-center">
      <div className="w-full h-20 sm:h-24 [@media(max-height:750px)]:h-14 relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          aria-label="Visualizador de espectro de audio de 56 bandas"
        />
      </div>
    </div>
  );
};
