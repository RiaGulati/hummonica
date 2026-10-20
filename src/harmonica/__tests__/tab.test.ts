/**
 * @jest-environment node
 */
import { nameToMidi, renderMelody, transcribe, type DetectedNote } from '../../dsp';
import { ODE_TO_JOY, ODE_TO_JOY_TAB } from '../../fixtures/ode-to-joy';
import { chooseHoles } from '../chooser';
import { buildTab, formatPosition, formatTab, type TabSettings } from '../tab';
import { bestTransposition } from '../transpose';

/** Make simple DetectedNotes from note names, 0.5 s each. */
function notes(names: string): DetectedNote[] {
  return names.split(' ').map((name, i) => {
    const midi = nameToMidi(name);
    return { midi, cents: 0, frequency: 0, start: i * 0.5, duration: 0.5 };
  });
}

function tabOf(names: string, settings: Partial<TabSettings> = {}): string {
  return formatTab(buildTab(notes(names), { allowBends: false, transpose: 'none', ...settings }));
}

describe('chooseHoles', () => {
  it('plays G4 as 2 draw after a low note and as 3 blow after a higher one', () => {
    expect(tabOf('C4 G4')).toBe('1↑ 2↓');
    expect(tabOf('B4 G4')).toBe('3↓ 3↑');
  });

  it('looks ahead: G4 before B4 is played on hole 3', () => {
    expect(tabOf('G4 B4')).toBe('3↑ 3↓');
  });

  it('skips unplayable notes when measuring movement', () => {
    const midis = ['B4', 'F#4', 'G4'].map(nameToMidi);
    const positions = chooseHoles(midis, false);
    expect(positions[1]).toBeNull();
    expect(positions[2]).toMatchObject({ hole: 3, breath: 'blow' });
  });
});

describe('formatting', () => {
  it('uses arrows for blow and draw and apostrophes for bends', () => {
    expect(formatPosition({ hole: 4, breath: 'blow', bend: 0, midi: 72 })).toBe('4↑');
    expect(formatPosition({ hole: 4, breath: 'draw', bend: 0, midi: 74 })).toBe('4↓');
    expect(formatPosition({ hole: 3, breath: 'draw', bend: 2, midi: 69 })).toBe("3↓''");
    expect(formatPosition({ hole: 10, breath: 'blow', bend: 1, midi: 95 })).toBe("10↑'");
    expect(formatPosition(null)).toBe('✕');
  });
});

describe('unplayable notes and bends', () => {
  const lowScale = 'C4 D4 E4 F4 G4 A4 B4 C5';

  it('flags notes missing from the low octave', () => {
    expect(tabOf(lowScale)).toBe('1↑ 1↓ 2↑ ✕ 2↓ ✕ 3↓ 4↑');
  });

  it('fills them in with bends when bends are allowed', () => {
    expect(tabOf(lowScale, { allowBends: true })).toBe("1↑ 1↓ 2↑ 2↓'' 2↓ 3↓'' 3↓ 4↑");
  });

  it('flags chromatic notes', () => {
    expect(tabOf('C5 C#5 D5 F#5 G5')).toBe('4↑ ✕ 4↓ ✕ 6↑');
    expect(tabOf('C5 C#5 D5 F#5 G5', { allowBends: true })).toBe("4↑ 4↓' 4↓ ✕ 6↑");
  });
});

describe('bestTransposition', () => {
  const odeInOctave = (octave: number) =>
    ODE_TO_JOY.map((n) => (n.midi as number) + 12 * (octave - 5));

  it('leaves a melody alone when it is already fully playable', () => {
    expect(bestTransposition(odeInOctave(5), 'any', false)).toEqual({ shift: 0, playableCount: 15 });
  });

  it('moves a low hummed melody up by octaves into the playable range', () => {
    // In octave 3 nothing is playable. Up one octave (octave 4) the F notes
    // are still missing. Up two octaves everything fits.
    expect(bestTransposition(odeInOctave(3), 'octave', false)).toEqual({
      shift: 24,
      playableCount: 15,
    });
  });

  it('changes key by the fewest semitones when allowed', () => {
    // Ode to Joy in D major (2 semitones up) has F# and C#, which are not
    // playable. Shifting down 2 semitones brings it back to C.
    const inD = odeInOctave(5).map((m) => m + 2);
    expect(bestTransposition(inD, 'octave', false).playableCount).toBeLessThan(15);
    expect(bestTransposition(inD, 'any', false)).toEqual({ shift: -2, playableCount: 15 });
  });

  it('does nothing in "none" mode', () => {
    expect(bestTransposition(odeInOctave(3), 'none', false).shift).toBe(0);
  });
});

describe('Ode to Joy fixture', () => {
  it('produces the expected tab from note numbers', () => {
    const detected: DetectedNote[] = ODE_TO_JOY.map((n, i) => ({
      midi: n.midi as number,
      cents: 0,
      frequency: 0,
      start: i,
      duration: n.duration,
    }));
    expect(formatTab(buildTab(detected))).toBe(ODE_TO_JOY_TAB);
  });

  it('produces the expected tab end to end from synthesized audio', () => {
    const sampleRate = 44100;
    const audio = renderMelody(ODE_TO_JOY, sampleRate, { harmonics: [1, 0.5, 0.25] });
    expect(formatTab(buildTab(transcribe(audio, sampleRate)))).toBe(ODE_TO_JOY_TAB);
  });

  it('produces the same tab when hummed an octave lower', () => {
    const sampleRate = 44100;
    const low = ODE_TO_JOY.map((n) => ({ ...n, midi: (n.midi as number) - 12 }));
    const audio = renderMelody(low, sampleRate, { harmonics: [1, 0.5, 0.25] });
    const tab = buildTab(transcribe(audio, sampleRate));
    expect(tab.shift).toBe(12);
    expect(formatTab(tab)).toBe(ODE_TO_JOY_TAB);
  });
});
