/**
 * Harmonica illustrations for the landing page (web only, plain SVG).
 * Everything is drawn here: there are no photographs on the page.
 */

const HOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** The note names of a C harmonica, hole by hole. */
const BLOW = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'];
const DRAW = ['D4', 'G4', 'B4', 'D5', 'F5', 'A5', 'B5', 'D6', 'F6', 'A6'];

/** Shared gradients for the steel covers and the dark comb. */
function HarmonicaDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f7f9fb" />
        <stop offset=".35" stopColor="#d9dfe5" />
        <stop offset=".62" stopColor="#b8c1ca" />
        <stop offset="1" stopColor="#8e99a4" />
      </linearGradient>
      <linearGradient id={`${id}-steel-low`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c3ccd4" />
        <stop offset=".5" stopColor="#a4afb9" />
        <stop offset="1" stopColor="#7b8692" />
      </linearGradient>
      <linearGradient id={`${id}-comb`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a2526" />
        <stop offset="1" stopColor="#141314" />
      </linearGradient>
    </defs>
  );
}

/**
 * A ten-hole harmonica seen from the front, 1080 × 276 units, drawn at the
 * origin. `numbers` stamps the hole numbers on the top cover.
 */
function Harmonica({ id, numbers = true }: { id: string; numbers?: boolean }) {
  return (
    <g>
      <path
        d="M18 70 Q18 18 70 14 L1010 14 Q1062 18 1062 70 L1062 96 L18 96 Z"
        fill={`url(#${id}-steel)`}
        stroke="#6d7782"
        strokeWidth="2"
      />
      <path d="M60 34 L1020 34" stroke="#ffffff" strokeWidth="4" opacity=".8" strokeLinecap="round" />
      <g stroke="#8a95a0" strokeWidth="2" opacity=".6">
        <path d="M150 52 H930" />
        <path d="M150 66 H930" />
      </g>
      <rect x="22" y="94" width="1036" height="88" rx="4" fill={`url(#${id}-comb)`} />
      <rect x="60" y="112" width="960" height="52" rx="8" fill="#ffc396" opacity=".14" />
      <g fill="#050505" stroke="#3d3739" strokeWidth="2">
        {HOLES.map((hole) => (
          <rect key={hole} x={78 + (hole - 1) * 96} y="114" width="62" height="48" rx="9" />
        ))}
      </g>
      <path
        d="M18 180 L1062 180 L1062 206 Q1062 258 1010 262 L70 262 Q18 258 18 206 Z"
        fill={`url(#${id}-steel-low)`}
        stroke="#5e6873"
        strokeWidth="2"
      />
      {numbers && (
        <g fontFamily="IBMPlexMono_500Medium, monospace" fontSize="18" fill="#3a434c" textAnchor="middle">
          {HOLES.map((hole) => (
            <text key={hole} x={109 + (hole - 1) * 96} y="90">
              {hole}
            </text>
          ))}
        </g>
      )}
      <g fill="#7d8893" stroke="#56606a">
        <circle cx="44" cy="55" r="8" />
        <circle cx="1036" cy="55" r="8" />
        <circle cx="44" cy="222" r="8" />
        <circle cx="1036" cy="222" r="8" />
      </g>
    </g>
  );
}

/** A tab note in a pill, as it floats out of the harmonica. */
function NotePill({ x, y, rotate, label, dark = false }: { x: number; y: number; rotate: number; label: string; dark?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x="-50" y="-30" width="100" height="52" rx="26" fill={dark ? '#141314' : '#f2f7fc'} />
      <text y="5" fontSize="26" textAnchor="middle" fill={dark ? '#fcfcfd' : '#000000'}>
        {label}
      </text>
    </g>
  );
}

/**
 * The hero picture: a C harmonica on a peach field, with the first four
 * notes of Ode to Joy (5↑ 5↑ 5↓ 6↑) rising from its holes.
 */
export function HeroHarmonica() {
  return (
    <svg
      viewBox="0 0 1338 632"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration of a ten-hole C harmonica with the first notes of Ode to Joy, 5 blow, 5 blow, 5 draw, 6 blow, rising from its holes">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd8b8" />
          <stop offset=".55" stopColor="#ffc396" />
          <stop offset="1" stopColor="#f6a46e" />
        </linearGradient>
        <radialGradient id="hero-glow" cx=".72" cy=".38" r=".6">
          <stop offset="0" stopColor="#fff3e8" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff3e8" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-soft" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <HarmonicaDefs id="hero" />
      <rect width="1338" height="632" fill="url(#hero-sky)" />
      <rect width="1338" height="632" fill="url(#hero-glow)" />
      <text className="hero-pic-label" x="40" y="44" fontFamily="IBMPlexMono_400Regular, monospace" fontSize="15" fill="#5c2c0d">
        C HARMONICA · 10 HOLES · 20 REEDS
      </text>
      <g transform="translate(700 262) rotate(-8) scale(.86)">
        <ellipse cx="0" cy="150" rx="560" ry="34" fill="#9b4a17" opacity=".35" filter="url(#hero-soft)" />
        <g transform="translate(-540 -110)">
          <Harmonica id="hero" />
        </g>
      </g>
      <path
        d="M760 205 C 790 150, 820 118, 860 104 S 960 60, 1000 66 S 1080 120, 1120 112 S 1200 40, 1240 46"
        fill="none"
        stroke="#5c2c0d"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        opacity=".6"
      />
      <g fontFamily="IBMPlexMono_500Medium, monospace">
        <NotePill x={860} y={104} rotate={-6} label="5↑" />
        <NotePill x={1000} y={66} rotate={4} label="5↑" />
        <NotePill x={1120} y={112} rotate={-3} label="5↓" dark />
        <NotePill x={1240} y={46} rotate={6} label="6↑" />
      </g>
    </svg>
  );
}

/**
 * Reading chart: the harmonica with each hole's blow note above it and draw
 * note below it, so a tab can be matched to the instrument.
 */
export function HarmonicaChart() {
  const holeX = (hole: number) => 109 + (hole - 1) * 96;
  return (
    <svg
      viewBox="0 0 1080 470"
      role="img"
      aria-label="Chart of a C harmonica. Blow notes, holes 1 to 10: C E G C E G C E G C. Draw notes: D G B D F A B D F A.">
      <HarmonicaDefs id="chart" />
      <g fontFamily="IBMPlexMono_400Regular, monospace" textAnchor="middle">
        <text x="0" y="28" textAnchor="start" fontSize="17" fill="#3b3b3b">
          ↑ BLOW
        </text>
        {BLOW.map((note, i) => (
          <g key={note + i}>
            <rect x={holeX(i + 1) - 38} y="48" width="76" height="44" rx="22" fill="#f2f7fc" stroke="#d3d8dd" />
            <text x={holeX(i + 1)} y="78" fontSize="20" fontFamily="IBMPlexMono_500Medium, monospace" fill="#000">
              {note.slice(0, -1)}
              <tspan fontSize="13" fill="#545353">
                {note.slice(-1)}
              </tspan>
            </text>
          </g>
        ))}
      </g>
      <g transform="translate(0 104)">
        <Harmonica id="chart" />
      </g>
      <g fontFamily="IBMPlexMono_400Regular, monospace" textAnchor="middle">
        {DRAW.map((note, i) => (
          <g key={note + i}>
            <rect x={holeX(i + 1) - 38} y="386" width="76" height="44" rx="22" fill="#141314" />
            <text x={holeX(i + 1)} y="416" fontSize="20" fontFamily="IBMPlexMono_500Medium, monospace" fill="#fcfcfd">
              {note.slice(0, -1)}
              <tspan fontSize="13" fill="#c4c2c6">
                {note.slice(-1)}
              </tspan>
            </text>
          </g>
        ))}
        <text x="0" y="462" textAnchor="start" fontSize="17" fill="#3b3b3b">
          ↓ DRAW
        </text>
      </g>
    </svg>
  );
}

/**
 * A harmonica lying on a sheet of tab, seen at an angle: the picture for
 * "Why I built this".
 */
export function HarmonicaOnTab() {
  const lines = ['6↑ 6↓ 6↑ 5↓ 5↑ 5↓ 5↑', '4↓ 4↑ 4↓ 5↑ 4↓ 4↑', '2↓ 2↓ 2↓ 4↑ 6↑', '5↓ 5↑ 4↓ 7↑ 6↑'];
  return (
    <svg viewBox="0 0 600 640" role="img" aria-label="Illustration of a harmonica lying across a page of handwritten harmonica tab">
      <HarmonicaDefs id="why" />
      <defs>
        <filter id="why-soft" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="600" height="640" rx="16" fill="#ffc396" />
      <g transform="translate(300 300) rotate(-6)">
        <rect x="-210" y="-250" width="420" height="520" rx="10" fill="#9b4a17" opacity=".25" filter="url(#why-soft)" />
        <rect x="-214" y="-262" width="420" height="520" rx="8" fill="#fcfcfd" />
        <g fontFamily="IBMPlexMono_500Medium, monospace" fontSize="25" fill="#141314">
          {lines.map((line, i) => (
            <text key={line} x="-180" y={-196 + i * 62}>
              {line}
            </text>
          ))}
        </g>
        <g stroke="#d3d8dd" strokeWidth="1.5">
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M-184 ${-182 + i * 62} H172`} />
          ))}
        </g>
        <text x="-180" y="110" fontFamily="IBMPlexMono_400Regular, monospace" fontSize="18" fill="#545353">
          for my roommate →
        </text>
      </g>
      <g transform="translate(320 470) rotate(-22) scale(.5)">
        <ellipse cx="0" cy="150" rx="540" ry="40" fill="#7a3a12" opacity=".4" filter="url(#why-soft)" />
        <g transform="translate(-540 -110)">
          <Harmonica id="why" />
        </g>
      </g>
    </svg>
  );
}

/** The logo mark, as an inline SVG for the landing page's header and footer. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#000" />
      <rect x="6" y="14" width="28" height="12" rx="3" fill="#ffc396" />
      <g fill="#000">
        <rect x="9" y="18" width="3" height="4" rx="1" />
        <rect x="14.25" y="18" width="3" height="4" rx="1" />
        <rect x="19.5" y="18" width="3" height="4" rx="1" />
        <rect x="24.75" y="18" width="3" height="4" rx="1" />
      </g>
    </svg>
  );
}
