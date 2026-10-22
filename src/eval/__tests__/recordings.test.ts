/**
 * @jest-environment node
 *
 * Evaluation on real recordings. Runs only on a computer that has the WAV
 * files in recordings/ (they are not in the repository). Prints a report, and
 * fails if Song mode scores below the minimum in references.ts:
 *
 *   npx jest recordings
 */
/// <reference types="node" />
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { transcribe, type TranscribeMode } from '../../dsp';
import { midiToName } from '../../dsp/notes';
import { decodeWav } from '../../dsp/wav';
import { REFERENCE_TABS } from '../../fixtures/references';
import { parseTab } from '../parse-tab';
import { scoreNotes, scoreNotesAnyKey, type NoteScore } from '../score';

const RECORDINGS = join(__dirname, '../../../recordings');
const available = REFERENCE_TABS.filter((r) => existsSync(join(RECORDINGS, r.file)));
const MODES: TranscribeMode[] = ['song', 'voice'];

function describeScore(label: string, score: NoteScore): string {
  return (
    `${label}: F1 ${score.f1.toFixed(2)}, ${(score.accuracy * 100).toFixed(0)}% found ` +
    `(${score.correct}/${score.referenceCount}), octave ${score.octave}, wrong ${score.wrong}, ` +
    `missing ${score.missing}, extra ${score.extra}`
  );
}

/** The alignment as two rows, reference above detected, for spotting patterns. */
function describePairs(score: NoteScore): string {
  const cell = (midi: number | null) => (midi === null ? '-' : midiToName(midi)).padEnd(4);
  const mark = { correct: ' ', octave: 'o', wrong: 'x', missing: 'm', extra: 'e' };
  return [
    'ref ' + score.pairs.map((p) => cell(p.reference)).join(''),
    'det ' + score.pairs.map((p) => cell(p.detected)).join(''),
    '    ' + score.pairs.map((p) => mark[p.kind].padEnd(4)).join(''),
  ].join('\n');
}

(available.length > 0 ? describe : describe.skip)('real recordings', () => {
  for (const reference of available) {
    it(reference.name, () => {
      const { samples, sampleRate } = decodeWav(readFileSync(join(RECORDINGS, reference.file)));
      const expected = parseTab(reference.tab);
      let songF1 = 0;
      const lines = [`${reference.name} (${(samples.length / sampleRate).toFixed(1)} s)`];

      for (const mode of MODES) {
        const detected = transcribe(samples, sampleRate, { mode }).map((n) => n.midi);
        const options = { partial: reference.partial };
        const exact = scoreNotes(detected, expected, options);
        const anyKey = scoreNotesAnyKey(detected, expected, options);
        lines.push(`  ${mode}: ${detected.length} notes detected`);
        lines.push('    ' + describeScore('same key', exact));
        lines.push('    ' + describeScore(`best key (shift ${anyKey.shift})`, anyKey));
        if (process.env.SHOW_ALIGNMENT) lines.push(describePairs(anyKey));
        if (mode === 'song') songF1 = anyKey.f1;
      }
      console.log(lines.join('\n'));
      expect(songF1).toBeGreaterThanOrEqual(reference.minSongF1);
    });
  }
});
