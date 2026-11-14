/**
 * The landing page at / on the web (the phone app opens straight on Listen).
 *
 * Plain DOM and CSS (landing.css) rather than React Native views: it is a
 * long, mostly static page that needs sticky positioning, grid layout and
 * real links. It shares the app's colours and IBM Plex fonts, which the root
 * layout has already loaded.
 *
 * Order: header, hero, How it works (a pinned walkthrough with screenshots),
 * four song intros, the six marks of a tab, why it exists, footer.
 */

import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

import { HarmonicaChart, HarmonicaOnTab, HeroHarmonica, LogoMark } from './illustrations';

import './landing.css';

/** Screenshots of the app, taken from the web version in light mode. */
const shot = (module: number) => Asset.fromModule(module).uri;

const STEPS = [
  {
    title: 'Open Listen',
    body: 'There are two buttons. Hum / Play listens for one note at a time: your voice, a whistle, or the harmonica itself. Song listens to recorded music and picks out the melody.',
    tip: 'Your browser asks to use the microphone the first time. Say yes.',
    image: shot(require('@/assets/landing/listen.webp')),
    imageNarrow: shot(require('@/assets/landing/listen-m.webp')),
    path: '/listen',
    alt: 'The Listen screen with a pitch meter and two buttons, Hum / Play and Song.',
  },
  {
    title: 'Hum the tune',
    body: 'Hum, sing or whistle, one note at a time. The meter shows the note you are making and the hole that plays it. Here, A5 is 6↓: breathe in on hole 6.',
    tip: 'A quiet room helps. You get 30 seconds per recording.',
    image: shot(require('@/assets/landing/listening.webp')),
    imageNarrow: shot(require('@/assets/landing/listening-m.webp')),
    path: '/listen',
    alt: 'Listening: the meter reads A5, 880 hertz, in tune, with the tab 6 draw. The Song button is greyed out while recording.',
  },
  {
    title: 'Press Stop. That’s your tab.',
    body: 'Every note becomes a hole and a direction: ↑ breathe out, ↓ breathe in. The bar under each note shows how long to hold it. Each recording is kept in History.',
    tip: 'This one is the start of Twinkle, Twinkle: 4↑ 4↑ 6↑ 6↑ 6↓ 6↓ 6↑.',
    image: shot(require('@/assets/landing/result.webp')),
    imageNarrow: shot(require('@/assets/landing/result-m.webp')),
    path: '/listen',
    alt: 'The result: 7 notes in 6.4 seconds, shown as the tab 4 blow, 4 blow, 6 blow, 6 blow, 6 draw, 6 draw, 6 blow, with Play tab, Play recording, Save tab and Share recording buttons.',
  },
  {
    title: 'Hear it before you play it',
    body: 'Play tab plays the tab with recordings of a real harmonica and lights up each note as it goes, so you can follow along and copy it.',
    tip: 'Pinch, or use − and +, to make the tab bigger.',
    image: shot(require('@/assets/landing/playing.webp')),
    imageNarrow: shot(require('@/assets/landing/playing-m.webp')),
    path: '/saved',
    alt: 'A saved tab of the Star Wars main theme playing, with the current note, 6 blow, highlighted in peach.',
  },
  {
    title: 'Choose your level',
    body: 'Starting out? Leave Bends off and every tab uses only notes a harmonica plays straight away. Transpose moves a tune up or down whole octaves so it fits the ten holes.',
    tip: "Ready for more? Turn on Bends to get notes like 3↓''.",
    image: shot(require('@/assets/landing/settings.webp')),
    imageNarrow: shot(require('@/assets/landing/settings-m.webp')),
    path: '/settings',
    alt: 'Settings: Bends is switched off, and Transpose is set to Octaves, with Off and Any key as the other choices.',
  },
  {
    title: 'Keep the ones you love',
    body: 'Save any tab with a name, or type one in from a book or a friend. Saved tabs live in Saved, recordings in History, and Songs has a library of classics to start from.',
    tip: 'Everything stays in your browser. Nothing is uploaded.',
    image: shot(require('@/assets/landing/saved.webp')),
    imageNarrow: shot(require('@/assets/landing/saved-m.webp')),
    path: '/saved',
    alt: 'The Saved screen listing four tabs: California Dreamin’, Yellow Submarine, Star Wars and Piano Man, each with its first notes.',
  },
];

const SONGS = [
  {
    name: 'Piano Man',
    part: 'Intro',
    notes: 13,
    level: 'No bends',
    image: shot(require('@/assets/landing/tab-piano.webp')),
    width: 800,
    height: 339,
  },
  {
    name: 'Star Wars',
    part: 'Main theme',
    notes: 19,
    level: 'No bends',
    image: shot(require('@/assets/landing/tab-star.webp')),
    width: 800,
    height: 394,
  },
  {
    name: 'Yellow Submarine',
    part: 'Chorus',
    notes: 16,
    level: 'No bends',
    image: shot(require('@/assets/landing/tab-yellow.webp')),
    width: 800,
    height: 394,
  },
  {
    name: 'California Dreamin’',
    part: 'Opening',
    notes: 10,
    level: "One bend: 3↓''",
    image: shot(require('@/assets/landing/tab-california.webp')),
    width: 800,
    height: 339,
  },
];

const MARKS = [
  { mark: '4↑', name: 'Blow', text: 'Breathe out through hole 4.' },
  { mark: '4↓', name: 'Draw', text: 'Breathe in through hole 4.' },
  { mark: "3↓'", name: 'Bend', text: "One ' per semitone lower." },
  { mark: '✕', name: 'Not playable', text: 'This harmonica has no such note.' },
  { mark: '▬', name: 'Length', text: 'Longer bar, longer note.' },
  { mark: '|', name: 'Pause', text: 'Breathe; the phrase ends.' },
];

const REASONS = [
  {
    lead: 'Learning an instrument takes years.',
    text: 'It takes a lot of time and practice to learn an instrument from scratch, to the point where you can play in front of people.',
  },
  {
    lead: 'Sometimes you just want one song.',
    text: 'You don’t always want the whole instrument. Sometimes you only want enough to play something people recognise.',
  },
  {
    lead: 'So every song becomes a simple tab.',
    text: 'Hummonica breaks songs down into plain harmonica tabs you can learn quickly, at your level: with or without bends, moved up or down an octave to fit.',
  },
  {
    lead: 'No sheet music? Record it.',
    text: 'The songs you actually want to play are often the hardest to find written down. Here you record it and get the tab straight away.',
  },
  {
    lead: 'Or just hum.',
    text: 'Hum / Play turns anything into tab: a tune stuck in your head, a ringtone, even an exclamation.',
  },
];

/** A link into the app: a real href, but navigates without reloading the page. */
function AppLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    router.push(href as never);
  }
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/** A link to a section of this page. The page scrolls inside its own container, so scroll by hand. */
function SectionLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const target = document.getElementById(to);
    if (!target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }
  return (
    <a href={`#${to}`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/** A screenshot in a browser window frame, with the app's address in the bar. */
function BrowserFrame({
  src,
  srcNarrow,
  alt,
  path,
  width = 860,
  height,
}: {
  src: string;
  /** A capture of the app at phone width, used on narrow screens so its text stays legible. */
  srcNarrow?: string;
  alt: string;
  path: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="frame">
      <div className="frame-bar" aria-hidden="true">
        <span className="frame-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="frame-address">hummonica{path}</span>
      </div>
      <picture>
        {srcNarrow && <source media="(max-width: 720px)" srcSet={srcNarrow} />}
        <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
      </picture>
    </figure>
  );
}

/** The walkthrough: steps scroll on the left while the matching screenshot stays pinned on the right. */
function Walkthrough() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      // A step is active while it crosses the middle band of the screen.
      { rootMargin: '-45% 0px -45% 0px' }
    );
    stepRefs.current.forEach((step) => step && observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="walk">
      <ol className="walk-steps">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-step={i}
            className={`walk-step${i === active ? ' is-active' : ''}`}>
            <span className="hole" aria-hidden="true">
              {i + 1}
            </span>
            <div className="walk-text">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <p className="tip">{step.tip}</p>
            </div>
            {/* On narrow screens each step carries its own screenshot. */}
            <div className="walk-inline">
              <BrowserFrame src={step.image} srcNarrow={step.imageNarrow} alt={step.alt} path={step.path} />
            </div>
          </li>
        ))}
      </ol>
      <div className="walk-stage" aria-hidden="true">
        <div className="walk-pin">
          {STEPS.map((step, i) => (
            <div key={step.title} className={`walk-shot${i === active ? ' is-active' : ''}`}>
              <BrowserFrame src={step.image} alt="" path={step.path} />
            </div>
          ))}
          <div className="walk-progress">
            {STEPS.map((step, i) => (
              <span key={step.title} className={i === active ? 'is-active' : undefined} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Hummonica: learn the song, not the whole harmonica';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="landing">
      <a className="skip" href="#how">
        Skip to How it works
      </a>
      <header className="wrap site-header">
        <div className="brandrow">
          <AppLink className="textlink brandrow-left" href="/songs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            Search songs
          </AppLink>
          <a className="logo" href="/" aria-label="Hummonica, home">
            <LogoMark />
            <span>Hummonica</span>
          </a>
          <div className="brandrow-right">
            <AppLink className="textlink hide-narrow" href="/songs">
              Song library
            </AppLink>
            <AppLink className="btn primary small" href="/listen">
              Open the app
            </AppLink>
          </div>
        </div>
        <nav className="nav" aria-label="On this page">
          <SectionLink to="how">How it works</SectionLink>
          <SectionLink to="tabs">Tabs</SectionLink>
          <SectionLink to="reading">Reading a tab</SectionLink>
          <SectionLink to="why">Why</SectionLink>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-picture">
            <HeroHarmonica />
          </div>
          <div className="hero-panel">
            <div className="hero-panel-inner">
              <h1 id="hero-title">
                Learn the song, <br className="br-wide" />
                not the whole <br className="br-wide" />
                harmonica.
              </h1>
              <div className="hero-side">
                <p className="lede">
                  Hummonica turns songs, and anything you hum, into simple harmonica tabs you can learn in an evening.
                </p>
                <div className="actions">
                  <AppLink className="btn primary" href="/listen">
                    Open the app
                  </AppLink>
                  <SectionLink className="btn secondary" to="how">
                    See how it works
                  </SectionLink>
                </div>
                <p className="trust">
                  <span className="chips" aria-hidden="true">
                    <span className="chip">5↑</span>
                    <span className="chip">5↓</span>
                    <span className="chip">6↑</span>
                  </span>
                  Ode to Joy: 30 notes, one&nbsp;evening.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="ground-alt">
          <section id="how" className="band wrap" tabIndex={-1} aria-labelledby="how-title">
            <div className="band-head">
              <p className="eyebrow">How it works</p>
              <h2 id="how-title">From a hum to a tab in two presses.</h2>
              <p className="band-lede">
                You don’t need to read music. You need a C harmonica, the most common kind, and about ten minutes. Here is
                everything the app does, in the order you’ll use it.
              </p>
            </div>
            <Walkthrough />
            <div className="band-cta">
              <AppLink className="btn primary" href="/listen">
                Try it now
              </AppLink>
              <span className="muted">Free, in your browser. Works best in Chrome.</span>
            </div>
          </section>

          <section id="tabs" className="band wrap" tabIndex={-1} aria-labelledby="tabs-title">
            <div className="band-head split">
              <div>
                <p className="eyebrow">Tabs</p>
                <h2 id="tabs-title">Four intros to learn this week.</h2>
              </div>
              <p className="band-lede">
                Short openings, typed into the app as tabs. Save your own the same way, or press Play to hear one first.
              </p>
            </div>
            <div className="gallery">
              {[SONGS.filter((_, i) => i % 2 === 0), SONGS.filter((_, i) => i % 2 === 1)].map((column, c) => (
                <div key={c} className="gallery-col">
                  {column.map((song) => (
                    <article key={song.name}>
                      <BrowserFrame
                        src={song.image}
                        alt={`Harmonica tab for ${song.name} (${song.part.toLowerCase()}), ${song.notes} notes, as shown in the app.`}
                        path="/saved"
                        width={song.width}
                        height={song.height}
                      />
                      <div className="gallery-caption">
                        <h3>{song.name}</h3>
                        <p>
                          {song.part} · {song.notes} notes · {song.level}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section id="reading" className="band wrap" tabIndex={-1} aria-labelledby="reading-title">
          <p className="marks-caption" id="reading-title">
            Every tab is written with six marks
          </p>
          <ul className="marks">
            {MARKS.map((mark) => (
              <li key={mark.name}>
                <span className="mark">{mark.mark}</span>
                <span className="mark-name">{mark.name}</span>
                <span className="mark-text">{mark.text}</span>
              </li>
            ))}
          </ul>
          <figure className="chart">
            <div className="chart-scroll">
              <HarmonicaChart />
            </div>
            <figcaption>
              A C harmonica, hole by hole. Blow notes on top, draw notes underneath. Hole 1 blow is middle C.
            </figcaption>
          </figure>
        </section>

        <section id="why" className="band wrap why" tabIndex={-1} aria-labelledby="why-title">
          <div className="why-text">
            <p className="eyebrow">Why I built this</p>
            <h2 id="why-title">For everyone who wants to play one song.</h2>
            <ol className="reasons">
              {REASONS.map((reason) => (
                <li key={reason.lead}>
                  <strong>{reason.lead}</strong> {reason.text}
                </li>
              ))}
            </ol>
            <p className="why-roommate">
              <strong>Why a harmonica?</strong> I started with it for my roommate, who wanted to learn some easy harmonica
              songs.
            </p>
            <AppLink className="btn primary" href="/listen">
              Play your first song
            </AppLink>
          </div>
          <div className="why-picture">
            <HarmonicaOnTab />
          </div>
        </section>
      </main>

      <footer className="wrap site-footer">
        <div className="footer-cols">
          <div>
            <h2>App</h2>
            <ul>
              <li>
                <AppLink href="/listen">Listen</AppLink>
              </li>
              <li>
                <AppLink href="/songs">Song library</AppLink>
              </li>
              <li>
                <AppLink href="/saved">Saved tabs</AppLink>
              </li>
              <li>
                <AppLink href="/settings">Settings</AppLink>
              </li>
            </ul>
          </div>
          <div>
            <h2>Learn</h2>
            <ul>
              <li>
                <SectionLink to="how">How it works</SectionLink>
              </li>
              <li>
                <SectionLink to="tabs">Four intros</SectionLink>
              </li>
              <li>
                <SectionLink to="reading">Reading a tab</SectionLink>
              </li>
            </ul>
          </div>
          <div>
            <h2>About</h2>
            <ul>
              <li>
                <SectionLink to="why">Why I built this</SectionLink>
              </li>
              <li>
                <AppLink href="/history">Your recordings</AppLink>
              </li>
            </ul>
          </div>
        </div>
        <p className="footer-name" aria-hidden="true">
          Hummonica
        </p>
        <div className="footer-base">
          <span>© 2026 Hummonica</span>
          <span>Song names belong to their owners. Tabs shown are short excerpts for practice.</span>
        </div>
      </footer>
    </div>
  );
}
