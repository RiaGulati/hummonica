/**
 * Downloads tabs from harmonica.com on the phone, for the user's personal use
 * (the site's terms allow downloading and copying for personal use). Nothing
 * from the site is stored in this project; a tab is only kept on the phone if
 * the user saves it.
 *
 * The site is built with WordPress, whose public REST API returns JSON:
 *   /wp-json/wp/v2/tab          the list of tabs (title, artist ids)
 *   /wp-json/wp/v2/tab-artist   the artists (id, name)
 *   /wp-json/wp/v2/tab/<id>     one tab page (its HTML content)
 *
 * The list (under 200 tabs) is downloaded once and kept in the cache folder
 * for a day, so searching is instant and does not send a request per letter.
 * If the phone is offline, the last downloaded list is used.
 */

import { readIndexCacheText, writeIndexCacheText } from './index-cache';
import {
  extractTabPage,
  parseArtists,
  parseTabIndex,
  type OnlineTabPage,
  type OnlineTabSummary,
} from './online-format';

export type { OnlineTabSummary } from './online-format';

const API = 'https://www.harmonica.com/wp-json/wp/v2';
export const SITE_TABS_URL = 'https://www.harmonica.com/songs/tabs/';
const PAGE_SIZE = 100; // the most the API returns per request
const TIMEOUT_MS = 15000;
const INDEX_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface OnlineTab extends OnlineTabSummary, OnlineTabPage {
  /** The tab's page on harmonica.com. */
  url: string;
}

/** Fetch JSON, giving up after TIMEOUT_MS. Also returns the number of result pages. */
async function getJson(url: string): Promise<{ data: unknown; totalPages: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`harmonica.com answered ${response.status}`);
    const totalPages = Number(response.headers.get('X-WP-TotalPages')) || 1;
    return { data: await response.json(), totalPages };
  } finally {
    clearTimeout(timer);
  }
}

/** Every item of a list, which the API splits into pages of up to 100. */
async function getAllPages(path: string, fields: string): Promise<unknown[]> {
  const url = (page: number) => `${API}/${path}?per_page=${PAGE_SIZE}&page=${page}&_fields=${fields}`;
  const first = await getJson(url(1));
  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) => getJson(url(i + 2)))
  );
  return [first, ...rest].flatMap((result) => (Array.isArray(result.data) ? result.data : []));
}

function readCachedIndex(): { savedAt: number; items: OnlineTabSummary[] } | null {
  try {
    const text = readIndexCacheText();
    if (text === null) return null;
    const cached = JSON.parse(text);
    return Array.isArray(cached?.items) && typeof cached.savedAt === 'number' ? cached : null;
  } catch {
    return null;
  }
}

let memoryIndex: OnlineTabSummary[] | null = null;

/** The list of all tabs on harmonica.com (title and artist). */
export async function fetchTabIndex(): Promise<OnlineTabSummary[]> {
  if (memoryIndex) return memoryIndex;
  const cached = readCachedIndex();
  if (cached && Date.now() - cached.savedAt < INDEX_MAX_AGE_MS) {
    memoryIndex = cached.items;
    return cached.items;
  }
  try {
    const [tabs, artists] = await Promise.all([
      getAllPages('tab', 'id,title,tab-artist'),
      getAllPages('tab-artist', 'id,name'),
    ]);
    const items = parseTabIndex(tabs, parseArtists(artists));
    memoryIndex = items;
    try {
      writeIndexCacheText(JSON.stringify({ savedAt: Date.now(), items }));
    } catch (error) {
      console.warn('Could not cache the harmonica.com list', error);
    }
    return items;
  } catch (error) {
    // Offline or the site is down: an older list is better than none.
    if (cached) return cached.items;
    throw error;
  }
}

const memoryTabs = new Map<number, OnlineTab>();

/** One tab page: the tab text blocks, facts and link. */
export async function fetchOnlineTab(id: number): Promise<OnlineTab> {
  const known = memoryTabs.get(id);
  if (known) return known;

  const { data } = await getJson(`${API}/tab/${id}?_fields=id,title,content,link,tab-artist`);
  const page = data as { content?: { rendered?: string }; link?: string };
  // Title and artist come from the list, which already has the artist names.
  const summary =
    (await fetchTabIndex().catch(() => [])).find((item) => item.id === id) ??
    parseTabIndex([data], new Map())[0];
  if (!summary || typeof page.content?.rendered !== 'string') {
    throw new Error('This tab could not be read');
  }
  const tab: OnlineTab = {
    ...summary,
    ...extractTabPage(page.content.rendered),
    url: typeof page.link === 'string' ? page.link : SITE_TABS_URL,
  };
  memoryTabs.set(id, tab);
  return tab;
}
