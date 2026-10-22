/**
 * Searching the song library by title or artist.
 *
 * Text is compared in a simplified form: lower case, accents removed
 * ("Frère" matches "frere") and punctuation ignored. Every word the user
 * types must match the start of some word in the title or artist, so
 * "jing bel" finds "Jingle Bells" and "foster" finds both Stephen Foster songs.
 * Songs whose title starts with the query come first, then A to Z.
 */

/** Anything with a title and an artist: library songs and harmonica.com tabs. */
interface Searchable {
  title: string;
  artist: string;
}

/** Lower case, no accents, punctuation turned into spaces. */
export function simplify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // the accent marks split off by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function searchSongs<T extends Searchable>(query: string, songs: T[]): T[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title);
  const queryWords = simplify(query).split(' ').filter(Boolean);
  if (queryWords.length === 0) return [...songs].sort(byTitle);

  const simpleQuery = queryWords.join(' ');
  const matches = songs.filter((song) => {
    const words = simplify(`${song.title} ${song.artist}`).split(' ');
    return queryWords.every((q) => words.some((word) => word.startsWith(q)));
  });
  const titleFirst = (song: T) => (simplify(song.title).startsWith(simpleQuery) ? 0 : 1);
  return matches.sort((a, b) => titleFirst(a) - titleFirst(b) || byTitle(a, b));
}
