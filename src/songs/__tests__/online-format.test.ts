/**
 * @jest-environment node
 */
import { formatTab } from '../../harmonica';
import {
  decodeHtml,
  extractTabPage,
  isTabLine,
  parseArtists,
  parseTabIndex,
  readTabText,
  tabFromText,
} from '../online-format';

// Small made-up examples in the same shape as the site's data.
const PAGE = `
<div class="tab-block-wrapper">
  <p><strong>Song facts:</strong> A song &#8220;about&#8221; things.</p>
  <p><strong>Harmonica type:</strong> diatonic</p>
  <div class="tab-sheet-wrapper"><pre class="">4 -4 5
Some words here
-5 6</pre></div>
  <pre>[5 -5] x2</pre>
</div>`;

describe('harmonica.com format', () => {
  it('decodes HTML entities', () => {
    expect(decodeHtml('Don&#8217;t &amp; &#x41;&quot;')).toBe('Don’t & A"');
  });

  it('reads the tab list with artist names', () => {
    const artists = parseArtists([
      { id: 7, name: 'Some &amp; Band' },
      { id: 8, name: 'Singer' },
    ]);
    const index = parseTabIndex(
      [
        { id: 1, title: { rendered: 'Song &#8211; Intro' }, 'tab-artist': [7] },
        { id: 2, title: { rendered: 'Duet' }, 'tab-artist': [7, 8] },
        { id: 'bad' },
      ],
      artists
    );
    expect(index).toEqual([
      { id: 1, title: 'Song – Intro', artist: 'Some & Band' },
      { id: 2, title: 'Duet', artist: 'Some & Band, Singer' },
    ]);
  });

  it('takes the facts and tab blocks out of a page', () => {
    const page = extractTabPage(PAGE);
    expect(page.facts).toEqual(['Song facts: A song “about” things.', 'Harmonica type: diatonic']);
    expect(page.blocks).toEqual(['4 -4 5\nSome words here\n-5 6', '[5 -5] x2']);
  });

  it('tells tab lines from lyrics', () => {
    expect(isTabLine(' 5  -5   6  6 ')).toBe(true);
    expect(isTabLine('[-5 5 -4] x2')).toBe(true);
    expect(isTabLine('Before you call him a man?')).toBe(false);
    expect(isTabLine('')).toBe(false);
  });

  it('reads joined notes, chords, curly bend marks and markers', () => {
    const { lines, unreadable } = readTabText('-6-7 45 -56\n-3” -3’ 6*\nla la la');
    expect(lines.map((line) => formatTab({ shift: 0, entries: line.map((position) => ({ detectedMidi: 0, midi: 0, start: 0, duration: 0, position })) })))
      .toEqual(['6↓ 7↓ 5↑ 6↓', "3↓'' 3↓' 6↑"]);
    expect(unreadable).toBe(0);
  });

  it('counts symbols that are not notes on a C harmonica', () => {
    expect(readTabText("4 -5' 4").unreadable).toBe(1);
  });

  it('makes a playable tab with a pause after each line', () => {
    const tab = tabFromText('4 -4\nwords\n5');
    expect(formatTab(tab)).toBe('4↑ 4↓ 5↑');
    const [, second, third] = tab.entries;
    expect(third.start - second.start).toBeGreaterThan(second.start - tab.entries[0].start);
  });
});
