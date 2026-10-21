/**
 * Published harmonica tabs (C harmonica) for the real test recordings.
 * The recordings themselves are not in the repository (they are copyrighted
 * music); put them in recordings/<file> as 16-bit WAV to run the evaluation.
 *
 * Sources:
 *   Piano Man intro: leccionesdearmonica.com (Bruno Berloto)
 *   Pirates of the Caribbean, Blowin' in the Wind: harmonica.com
 */

export interface ReferenceTab {
  name: string;
  /** File name inside recordings/. */
  file: string;
  /** The tab in website notation: "4" blow, "-4" draw. */
  tab: string;
  /** True if the recording may cover only the start of the tab. */
  partial: boolean;
}

export const REFERENCE_TABS: ReferenceTab[] = [
  {
    name: 'Piano Man (intro)',
    file: 'piano-man-intro.wav',
    tab: `
      6 -6 6 -5 5 -5 5
      4 -4 5 -4
      5 -5 6 -6 6 -5 5 -5 5
      4 -5 5 -4 4`,
    partial: false,
  },
  {
    name: 'Pirates of the Caribbean',
    file: 'pirates-of-the-caribbean.wav',
    tab: '-4 5 -5 6 -6 6 -5 5 -5 6 -6 6 -5 6 -6 6 -5 5 -5 5 -4 5 4 -4',
    partial: false,
  },
  {
    name: "Blowin' in the Wind",
    file: 'blowing-in-the-wind.wav',
    tab: `
      6 6 6 -6 6 -5 6 5 -4 4
      5 6 6 -6 6 -5 6
      5 -5 6 6 6 -6
      6 -5 6 5 -4 4
      5 6 6 -5 -5 5 -4
      5 -5 6 6 6 -6
      6 -5 6 6 -5 4
      5 6 6 -6 6 -5 6
      5 -5 -5 5 -4
      -4 5 5 5 -4 4`,
    partial: true,
  },
];
