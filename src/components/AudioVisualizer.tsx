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

    let logicalWidth = canvas.clientWidth || 560;
    let logicalHeight = canvas.clientHeight || 88;

    const updateCanvasResolution = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const rect = canvas.getBoundingClientRect();
      logicalWidth = Math.max(240, rect.width || 560);
      logicalHeight = Math.max(48, rect.height || 88);

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

      const halfCount = BAR_COUNT / 2;
      let allSettledAtRest = true;

      for (let i = 0; i < BAR_COUNT; i++) {
        const distFromCenter = Math.abs(i - (halfCount - 0.5)) / halfCount;
        let targetAmplitude = 0;

        if (activePlaying) {
          if (hasRealAudioData) {
            const binIndex = Math.min(
              FFT_BINS - 1,
              Math.floor(Math.pow(distFromCenter, 1.15) * 48) + (i % 2)
            );
            const rawVal = freqData[binIndex] / 255;
            const eqLift = 1 + distFromCenter * 0.65;
            const envelope = 1 - Math.pow(distFromCenter, 2.2) * 0.25;
            targetAmplitude = Math.min(1, Math.pow(rawVal * eqLift, 1.1) * envelope);
          } else {
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

        if (bars[i] >= peaks[i]) {
          peaks[i] = bars[i];
          peakVels[i] = 0;
        } else {
          peakVels[i] += 0.0012;
          peaks[i] = Math.max(0, peaks[i] - peakVels[i]);
        }

        if (peaks[i] > 0.004) {
          allSettledAtRest = false;
        } else {
          peaks[i] = 0;
        }
      }

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const isLightMode = !document.documentElement.classList.contains('dark') &&
        !canvas.closest('.dark');

      const centerY = logicalHeight / 2;
      const maxHalfHeight = Math.max(12, centerY - 6);
      const minHalfHeight = 2.4;

      const horizontalPadding = 8;
      const availableWidth = logicalWidth - horizontalPadding * 2;
      const step = availableWidth / BAR_COUNT;
      const barWidth = Math.max(3, Math.min(6.5, step * 0.62));

      // Subtle center horizon line
      ctx.fillStyle = isLightMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.12)';
      ctx.fillRect(horizontalPadding, centerY - 0.5, availableWidth, 1);

      for (let i = 0; i < BAR_COUNT; i++) {
        const amp = bars[i];
        const peakAmp = peaks[i];
        const x = horizontalPadding + i * step + (step - barWidth) / 2;

        const halfH = minHalfHeight + amp * (maxHalfHeight - minHalfHeight);
        const totalH = halfH * 2;
        const y = centerY - halfH;

        // Bicolor capsule distribution matching AudioCar Radio (#3B82F6 blue & #EF4444 red)
        const isRedAccent = i % 3 === 1 || amp > 0.68;

        if (amp > 0.015) {
          ctx.fillStyle = isRedAccent ? '#EF4444' : '#3B82F6';
          if (amp > 0.5 && !isLightMode) {
            ctx.shadowColor = isRedAccent ? 'rgba(239, 68, 68, 0.45)' : 'rgba(59, 130, 246, 0.45)';
            ctx.shadowBlur = 8 * amp;
          } else {
            ctx.shadowBlur = 0;
          }
          drawCapsule(x, y, barWidth, totalH, barWidth / 2);
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = isRedAccent
            ? isLightMode
              ? 'rgba(239, 68, 68, 0.35)'
              : 'rgba(239, 68, 68, 0.38)'
            : isLightMode
            ? 'rgba(59, 130, 246, 0.35)'
            : 'rgba(59, 130, 246, 0.42)';
          drawCapsule(x, centerY - minHalfHeight, barWidth, minHalfHeight * 2, barWidth / 2);
        }

        // Peak-hold caps
        if (peakAmp > 0.08) {
          ctx.shadowBlur = 0;
          const peakOffset = minHalfHeight + peakAmp * (maxHalfHeight - minHalfHeight) + 2.5;
          const capHeight = Math.min(2.6, barWidth * 0.65);
          const capAlpha = Math.min(0.95, 0.4 + peakAmp * 0.6);

          ctx.fillStyle = isRedAccent
            ? `rgba(239, 68, 68, ${capAlpha})`
            : `rgba(77, 168, 255, ${capAlpha})`;

          drawCapsule(
            x,
            Math.max(1, centerY - peakOffset - capHeight),
            barWidth,
            capHeight,
            capHeight / 2
          );

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
    <div className="w-full h-20 lg:h-28 [@media(max-height:700px)]:h-16 relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-label="Visualizador de espectro de onda en tiempo real"
      />
    </div>
  );
};
