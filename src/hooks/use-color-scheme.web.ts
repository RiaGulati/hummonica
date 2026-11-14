/**
 * The web version always uses the light theme, so the app matches the landing
 * page (which is designed in light only). The phone app follows the system
 * setting; see use-color-scheme.ts.
 */
export function useColorScheme(): 'light' {
  return 'light';
}
