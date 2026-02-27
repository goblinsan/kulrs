/**
 * Web Audio playback engine for Kulrs compositions.
 *
 * Uses the Web Audio API with simple oscillator-based synthesis.
 * Each chord step plays its MIDI notes as a sustained pad, while
 * the melody note plays as a plucked tone on top.
 */

import { midiToFrequency, type Composition } from '@kulrs/shared';

export interface PlaybackCallbacks {
  /** Called when a new step starts playing. */
  onStep?: (stepIndex: number) => void;
  /** Called when playback finishes. */
  onEnd?: () => void;
}

let currentCtx: AudioContext | null = null;
let stopRequested = false;

/**
 * Stop any currently-playing composition.
 */
export function stopPlayback() {
  stopRequested = true;
  if (currentCtx && currentCtx.state !== 'closed') {
    currentCtx.close();
  }
  currentCtx = null;
}

/**
 * Play a composition through the Web Audio API.
 * Returns a promise that resolves when playback finishes or is stopped.
 * @param startFromStep - Optional step index to start playback from (default 0).
 */
export async function playComposition(
  composition: Composition,
  callbacks?: PlaybackCallbacks,
  startFromStep = 0
): Promise<void> {
  stopPlayback();
  stopRequested = false;

  const ctx = new AudioContext();
  currentCtx = ctx;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(ctx.destination);

  const beatDuration = 60 / composition.tempo; // seconds per beat

  let currentTime = ctx.currentTime + 0.05; // tiny lead-in

  for (let i = startFromStep; i < composition.steps.length; i++) {
    if (stopRequested) break;

    const step = composition.steps[i].chord;
    const stepDuration = step.beats * beatDuration;

    // Schedule onStep callback
    const stepIndex = i;
    const callbackDelay = (currentTime - ctx.currentTime) * 1000;
    if (callbacks?.onStep) {
      setTimeout(
        () => {
          if (!stopRequested) callbacks.onStep!(stepIndex);
        },
        Math.max(0, callbackDelay)
      );
    }

    // ── Chord pad (sawtooth, low-pass filtered) ──
    for (const midi of step.midiNotes) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midiToFrequency(midi);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, currentTime);
      env.gain.linearRampToValueAtTime(
        (step.velocity / 127) * 0.15,
        currentTime + 0.08
      );
      env.gain.setValueAtTime(
        (step.velocity / 127) * 0.12,
        currentTime + stepDuration - 0.1
      );
      env.gain.linearRampToValueAtTime(0, currentTime + stepDuration);

      osc.connect(filter);
      filter.connect(env);
      env.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + stepDuration);
    }

    // ── Melody note (triangle, brighter) ──
    {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToFrequency(step.melodyNote.midi);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, currentTime);
      env.gain.linearRampToValueAtTime(0.3, currentTime + 0.02);
      env.gain.exponentialRampToValueAtTime(
        0.001,
        currentTime + stepDuration * 0.8
      );

      osc.connect(env);
      env.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + stepDuration);
    }

    currentTime += stepDuration;
  }

  // Wait for playback to finish
  const totalDuration =
    composition.steps
      .slice(startFromStep)
      .reduce((sum, s) => sum + s.chord.beats, 0) * beatDuration;

  return new Promise(resolve => {
    const timeout = setTimeout(
      () => {
        if (!stopRequested) callbacks?.onEnd?.();
        resolve();
      },
      totalDuration * 1000 + 200
    );

    // If stopped early, resolve immediately
    const check = setInterval(() => {
      if (stopRequested) {
        clearTimeout(timeout);
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}
