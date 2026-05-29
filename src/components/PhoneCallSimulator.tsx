import React, { useEffect, useRef, useState } from 'react';
import { PhoneCallScene } from './PhoneCallScene';

type PhoneCallSimulatorProps = {
  phoneNumber: string;
  audioUrl: string | null;
  ringDurationSeconds: 0 | 1 | 2 | 3;
  playing: boolean;
  onPlaybackComplete: () => void;
};

export function PhoneCallSimulator({
  phoneNumber,
  audioUrl,
  ringDurationSeconds,
  playing,
  onPlaybackComplete,
}: PhoneCallSimulatorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRefs = useRef<OscillatorNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!playing) {
      setElapsedSeconds(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      oscillatorRefs.current.forEach((oscillator) => {
        try { oscillator.stop(); } catch {}
      });
      oscillatorRefs.current = [];
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
      gainRef.current = null;
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    const startedAt = performance.now();

    const startRingTone = async () => {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const gain = audioContext.createGain();
      gain.gain.value = 0.035;
      gain.connect(audioContext.destination);
      gainRef.current = gain;

      oscillatorRefs.current = [440, 480].map((frequency) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
    };

    const stopRingTone = () => {
      oscillatorRefs.current.forEach((oscillator) => {
        try { oscillator.stop(); } catch {}
      });
      oscillatorRefs.current = [];
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
      gainRef.current = null;
    };

    const tick = () => {
      const seconds = (performance.now() - startedAt) / 1000;
      setElapsedSeconds(seconds);

      if (gainRef.current) {
        const ringCycleSeconds = seconds % 6;
        gainRef.current.gain.value = ringCycleSeconds < 2 && seconds < ringDurationSeconds ? 0.035 : 0;
      }

      animationFrame = requestAnimationFrame(tick);
    };

    if (ringDurationSeconds > 0) {
      void startRingTone().catch(() => {});
    }
    tick();

    const voicemailTimer = window.setTimeout(() => {
      stopRingTone();
      if (audioRef.current && audioUrl && !cancelled) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => {});
      }
    }, ringDurationSeconds * 1000);

    const completionTimer = window.setTimeout(() => {
      if (!audioUrl) onPlaybackComplete();
    }, ringDurationSeconds * 1000 + 400);

    return () => {
      cancelled = true;
      window.clearTimeout(voicemailTimer);
      window.clearTimeout(completionTimer);
      cancelAnimationFrame(animationFrame);
      stopRingTone();
    };
  }, [playing, audioUrl, ringDurationSeconds, onPlaybackComplete]);

  return (
    <div className="mx-auto w-fit">
      <PhoneCallScene phoneNumber={phoneNumber} seconds={elapsedSeconds} ringDurationSeconds={ringDurationSeconds} scale={0.43} />
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onEnded={onPlaybackComplete} preload="auto" />
      )}
    </div>
  );
}
