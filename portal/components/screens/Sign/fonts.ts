import localFont from 'next/font/local';

/*
 * The signing pages' fonts (latin, OFL), bundled in the repo rather than
 * loaded with next/font/google: when Google serves a family from a link
 * without a file extension, next/font fails the whole build.
 */

/** Inter, for the signing and verify pages. */
export const signSans = localFont({
  src: './fonts/Inter-latin.woff2',
  weight: '100 900',
  variable: '--sign-sans',
});

/** Source Serif 4, for document text. */
export const signSerif = localFont({
  src: './fonts/SourceSerif4-latin.woff2',
  weight: '200 900',
  variable: '--sign-serif',
});

/** Caveat at 600, for typed signatures. */
export const signHand = localFont({
  src: '../Task/fonts/Caveat-latin.woff2',
  weight: '600',
  variable: '--sign-hand',
});
