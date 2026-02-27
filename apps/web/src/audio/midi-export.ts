/**
 * MIDI file export for Kulrs compositions.
 *
 * Builds a standard MIDI file (format 0) from a Composition object.
 * Uses raw byte manipulation — no external dependencies.
 */

import type { Composition } from '@kulrs/shared';

// ── Low-level MIDI helpers ───────────────────────────────────────────────

function toVarLen(value: number): number[] {
  if (value < 0) value = 0;
  const bytes: number[] = [];
  bytes.push(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    bytes.push((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes.reverse();
}

function encodeString(str: string): number[] {
  return Array.from(str).map(ch => ch.charCodeAt(0));
}

function uint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function uint32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Export a Composition to a MIDI file Blob.
 */
export function compositionToMidi(composition: Composition): Blob {
  const TICKS_PER_BEAT = 480;

  const trackData: number[] = [];

  // Track name meta event
  const nameBytes = encodeString('Kulrs Composition');
  trackData.push(
    ...toVarLen(0),
    0xff,
    0x03,
    ...toVarLen(nameBytes.length),
    ...nameBytes
  );

  // Tempo meta event (μs per beat)
  const usPerBeat = Math.round(60_000_000 / composition.tempo);
  trackData.push(
    ...toVarLen(0),
    0xff,
    0x51,
    0x03,
    (usPerBeat >> 16) & 0xff,
    (usPerBeat >> 8) & 0xff,
    usPerBeat & 0xff
  );

  // Time signature meta event
  trackData.push(
    ...toVarLen(0),
    0xff,
    0x58,
    0x04,
    composition.timeSignatureTop,
    0x02, // denominator = 2^2 = 4
    0x18, // 24 MIDI clocks per metronome click
    0x08 // 8 thirty-second notes per 24 MIDI clocks
  );

  // ── Write notes for each step ──
  for (const step of composition.steps) {
    const { chord } = step;
    const durationTicks = chord.beats * TICKS_PER_BEAT;
    const vel = Math.max(1, Math.min(127, chord.velocity));

    // Note-on: chord (channel 0) + melody (channel 1)
    const allNotes = [
      ...chord.midiNotes.map(m => ({ midi: m, channel: 0, vel })),
      {
        midi: chord.melodyNote.midi,
        channel: 1,
        vel: Math.min(127, vel + 10),
      },
    ];

    // All note-ons at delta=0
    allNotes.forEach((n, idx) => {
      const delta = idx === 0 ? 0 : 0;
      trackData.push(
        ...toVarLen(delta),
        0x90 | n.channel,
        n.midi & 0x7f,
        n.vel & 0x7f
      );
    });

    // All note-offs after durationTicks
    allNotes.forEach((n, idx) => {
      const delta = idx === 0 ? durationTicks : 0;
      trackData.push(...toVarLen(delta), 0x80 | n.channel, n.midi & 0x7f, 0x00);
    });
  }

  // End-of-track meta event
  trackData.push(...toVarLen(0), 0xff, 0x2f, 0x00);

  // ── Assemble file ──
  const header = [
    ...encodeString('MThd'),
    ...uint32(6), // header length
    ...uint16(0), // format 0
    ...uint16(1), // 1 track
    ...uint16(TICKS_PER_BEAT),
  ];

  const track = [
    ...encodeString('MTrk'),
    ...uint32(trackData.length),
    ...trackData,
  ];

  return new Blob([new Uint8Array([...header, ...track])], {
    type: 'audio/midi',
  });
}

/**
 * Trigger a MIDI file download in the browser.
 */
export function downloadMidi(
  composition: Composition,
  filename = 'kulrs-composition.mid'
) {
  const blob = compositionToMidi(composition);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
