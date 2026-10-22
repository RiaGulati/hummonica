/**
 * Built-in song library: well-known PUBLIC DOMAIN melodies, written out for
 * this app. (Tabs from websites such as harmonica.com are copyrighted and
 * their terms do not allow copying them into an app; the user can still look
 * them up in the browser and type or paste one in for personal use.)
 *
 * Every melody is in C and placed so it can be played on a C harmonica
 * without bends (a test checks this). The tab is made from the notes by the
 * same code as for recordings, so playback and the tab view work the same way.
 *
 * Melody format: note names with octave, separated by spaces. A note lasts one
 * beat unless followed by ":<beats>", for example "G5:2" or "E5:.5".
 * "R" is a rest.
 */

import { midiToFrequency, nameToMidi } from '../dsp/notes';
import type { DetectedNote } from '../dsp/segment';

export interface LibrarySong {
  id: string;
  title: string;
  /** Composer or "Traditional". */
  artist: string;
  /** Beats per minute (one beat = one unit in the melody). */
  bpm: number;
  melody: string;
}

export const SONG_LIBRARY: LibrarySong[] = [
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    bpm: 120,
    melody:
      'E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 E5:1.5 D5:.5 D5:2 ' +
      'E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 D5:1.5 C5:.5 C5:2',
  },
  {
    id: 'twinkle-twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    artist: 'Traditional',
    bpm: 110,
    melody:
      'C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2 ' +
      'G5 G5 F5 F5 E5 E5 D5:2 G5 G5 F5 F5 E5 E5 D5:2 ' +
      'C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2',
  },
  {
    id: 'mary-had-a-little-lamb',
    title: 'Mary Had a Little Lamb',
    artist: 'Traditional',
    bpm: 120,
    melody: 'E5 D5 C5 D5 E5 E5 E5:2 D5 D5 D5:2 E5 G5 G5:2 E5 D5 C5 D5 E5 E5 E5 E5 D5 D5 E5 D5 C5:4',
  },
  {
    id: 'happy-birthday',
    title: 'Happy Birthday to You',
    artist: 'Mildred J. Hill and Patty Hill',
    bpm: 110,
    melody:
      'G5:.75 G5:.25 A5 G5 C6 B5:2 G5:.75 G5:.25 A5 G5 D6 C6:2 ' +
      'G5:.75 G5:.25 G6 E6 C6 B5 A5:2 F6:.75 F6:.25 E6 C6 D6 C6:2',
  },
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    artist: 'James Lord Pierpont',
    bpm: 140,
    melody:
      'E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4 ' +
      'F5 F5 F5:1.5 F5:.5 F5 E5 E5 E5:.5 E5:.5 E5 D5 D5 E5 D5:2 G5:2 ' +
      'E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4 ' +
      'F5 F5 F5:1.5 F5:.5 F5 E5 E5 E5:.5 E5:.5 G5 G5 F5 D5 C5:4',
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Traditional (John Newton)',
    bpm: 90,
    melody:
      'G5 C6:2 E6:.5 C6:.5 E6:2 D6 C6:2 A5 G5:2 G5 C6:2 E6:.5 C6:.5 E6:2 D6 G6:3 ' +
      'R E6 G6:2 E6:.5 G6:.5 E6:2 D6 C6:2 A5 G5:2 G5 C6:2 E6:.5 C6:.5 E6:2 D6 C6:3',
  },
  {
    id: 'when-the-saints',
    title: 'When the Saints Go Marching In',
    artist: 'Traditional',
    bpm: 150,
    melody:
      'C5 E5 F5 G5:4 C5 E5 F5 G5:4 C5 E5 F5 G5:2 E5:2 C5:2 E5:2 D5:4 ' +
      'E5 E5 D5 C5:3 C5 E5 G5 G5 F5:3 E5 F5 G5:2 E5:2 C5:2 D5:2 C5:4',
  },
  {
    id: 'oh-susanna',
    title: 'Oh! Susanna',
    artist: 'Stephen Foster',
    bpm: 130,
    melody:
      'C5:.5 D5:.5 E5 G5 G5:1.5 A5:.5 G5 E5 C5:1.5 D5:.5 E5 E5 D5 C5 D5:3 ' +
      'C5:.5 D5:.5 E5 G5 G5:1.5 A5:.5 G5 E5 C5:1.5 D5:.5 E5 E5 D5 D5 C5:4 ' +
      'F5:2 F5:2 A5 A5:2 A5 G5 G5 E5 C5 D5:3 ' +
      'C5:.5 D5:.5 E5 G5 G5:1.5 A5:.5 G5 E5 C5:1.5 D5:.5 E5 E5 D5 D5 C5:4',
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    artist: 'Traditional',
    bpm: 120,
    melody:
      'C5 D5 E5 C5 C5 D5 E5 C5 E5 F5 G5:2 E5 F5 G5:2 ' +
      'G5:.5 A5:.5 G5:.5 F5:.5 E5 C5 G5:.5 A5:.5 G5:.5 F5:.5 E5 C5 ' +
      'C5 G4 C5:2 C5 G4 C5:2',
  },
  {
    id: 'row-your-boat',
    title: 'Row, Row, Row Your Boat',
    artist: 'Traditional',
    bpm: 110,
    melody:
      'C5:1.5 C5:1.5 C5 D5:.5 E5:1.5 E5 D5:.5 E5 F5:.5 G5:3 ' +
      'C6:.5 C6:.5 C6:.5 G5:.5 G5:.5 G5:.5 E5:.5 E5:.5 E5:.5 C5:.5 C5:.5 C5:.5 ' +
      'G5 F5:.5 E5 D5:.5 C5:3',
  },
  {
    id: 'london-bridge',
    title: 'London Bridge Is Falling Down',
    artist: 'Traditional',
    bpm: 120,
    melody:
      'G5:1.5 A5:.5 G5 F5 E5 F5 G5:2 D5 E5 F5:2 E5 F5 G5:2 ' +
      'G5:1.5 A5:.5 G5 F5 E5 F5 G5:2 D5:2 G5:2 E5 C5:3',
  },
  {
    id: 'silent-night',
    title: 'Silent Night',
    artist: 'Franz Xaver Gruber',
    bpm: 100,
    melody:
      'G5:1.5 A5:.5 G5 E5:3 G5:1.5 A5:.5 G5 E5:3 D6:2 D6 B5:3 C6:2 C6 G5:3 ' +
      'A5:2 A5 C6:1.5 B5:.5 A5 G5:1.5 A5:.5 G5 E5:3 ' +
      'A5:2 A5 C6:1.5 B5:.5 A5 G5:1.5 A5:.5 G5 E5:3 ' +
      'D6:2 D6 F6:1.5 D6:.5 B5 C6:3 E6:3 C6:1.5 G5:.5 E5 G5:1.5 F5:.5 D5 C5:6',
  },
  {
    id: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    artist: 'Traditional (Robert Burns)',
    bpm: 100,
    melody:
      'G5 C6:1.5 C6:.5 C6 E6 D6:1.5 C6:.5 D6 E6 C6:1.5 C6:.5 E6 G6 A6:3 ' +
      'A6 G6:1.5 E6:.5 E6 C6 D6:1.5 C6:.5 D6 E6 C6:1.5 A5:.5 A5 G5 C6:3',
  },
  {
    id: 'yankee-doodle',
    title: 'Yankee Doodle',
    artist: 'Traditional',
    bpm: 140,
    melody:
      'C6 C6 D6 E6 C6 E6 D6 G5 C6 C6 D6 E6 C6:2 B5:2 ' +
      'C6 C6 D6 E6 F6 E6 D6 C6 B5 G5 A5 B5 C6:2 C6:2',
  },
  {
    id: 'brahms-lullaby',
    title: "Brahms' Lullaby",
    artist: 'Johannes Brahms',
    bpm: 90,
    melody:
      'E5:.5 E5:.5 G5:3 E5:.5 E5:.5 G5:3 E5:.5 G5:.5 C6 B5:1.5 A5:.5 A5 G5:2 ' +
      'D5:.5 E5:.5 F5:2 D5:.5 D5:.5 E5 F5:2 D5:.5 F5:.5 B5:.5 A5:.5 G5 B5 C6:3',
  },
  {
    id: 'kumbaya',
    title: 'Kumbaya',
    artist: 'Traditional',
    bpm: 90,
    melody:
      'C5 E5 G5 G5:2 A5 A5 G5:3 C5 E5 G5 G5:2 F5 E5 D5:3 ' +
      'C5 E5 G5 G5:2 A5 A5 G5:3 F5 E5 D5 D5 C5:3',
  },
  {
    id: 'old-macdonald',
    title: 'Old MacDonald Had a Farm',
    artist: 'Traditional',
    bpm: 130,
    melody:
      'C6 C6 C6 G5 A5 A5 G5:2 E6 E6 D6 D6 C6:3 G5 ' +
      'C6 C6 C6 G5 A5 A5 G5:2 E6 E6 D6 D6 C6:4',
  },
  {
    id: 'we-wish-you-a-merry-christmas',
    title: 'We Wish You a Merry Christmas',
    artist: 'Traditional',
    bpm: 130,
    melody:
      'G5 C6 C6:.5 D6:.5 C6:.5 B5:.5 A5 A5 A5 D6 D6:.5 E6:.5 D6:.5 C6:.5 B5 G5 ' +
      'G5 E6 E6:.5 F6:.5 E6:.5 D6:.5 C6 A5 G5:.5 G5:.5 A5 D6 B5 C6:3',
  },
  {
    id: 'joy-to-the-world',
    title: 'Joy to the World',
    artist: 'Lowell Mason (after Handel)',
    bpm: 110,
    melody:
      'C6:2 B5:1.5 A5:.5 G5:3 F5 E5:2 D5:2 C5:3 G5 A5:3 A5 B5:3 B5 C6:3 ' +
      'C6 C6 B5 A5 G5 G5:1.5 F5:.5 E5 C6 C6 B5 A5 G5 G5:1.5 F5:.5 E5',
  },
  {
    id: 'camptown-races',
    title: 'Camptown Races',
    artist: 'Stephen Foster',
    bpm: 140,
    melody: 'G5 G5 E5 G5 A5 G5 E5:2 E5 D5:3 E5 D5:3 G5 G5 E5 G5 A5 G5 E5:2 D5:2 E5 D5 C5:4',
  },
  {
    id: 'this-old-man',
    title: 'This Old Man',
    artist: 'Traditional',
    bpm: 120,
    melody:
      'G5 E5 G5:2 G5 E5 G5:2 A5 G5 F5 E5 D5 E5 F5:2 E5 F5 G5:2 ' +
      'C5 C5 C5:.5 C5:.5 C5:.5 D5:.5 E5:.5 F5:.5 G5:2 G5 D5 D5 F5 E5 D5 C5:4',
  },
];

/** Gap left at the end of each note, like re-tonguing, so repeated notes stay separate. */
const NOTE_GAP_SECONDS = 0.04;

/** Turn a song's melody into notes with start times and lengths. */
export function songNotes(song: LibrarySong): DetectedNote[] {
  const beatSeconds = 60 / song.bpm;
  const notes: DetectedNote[] = [];
  let time = 0;
  for (const token of song.melody.trim().split(/\s+/)) {
    const [name, beatsText] = token.split(':');
    const beats = beatsText ? Number(beatsText) : 1;
    if (!(beats > 0)) throw new Error(`Bad length in "${token}" (${song.id})`);
    const length = beats * beatSeconds;
    if (name !== 'R') {
      const midi = nameToMidi(name); // throws on a bad note name
      notes.push({
        midi,
        cents: 0,
        frequency: midiToFrequency(midi),
        start: time,
        duration: Math.max(0.05, length - NOTE_GAP_SECONDS),
      });
    }
    time += length;
  }
  return notes;
}

export function findSong(id: string): LibrarySong | undefined {
  return SONG_LIBRARY.find((song) => song.id === id);
}
