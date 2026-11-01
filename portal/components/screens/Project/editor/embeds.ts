/*
 * Links people paste as embeds. Known services play inside the page; any
 * other link shows as a bookmark card. Only these https players are ever put
 * in an iframe, never the pasted address itself.
 */

export type EmbedPlayer = {
  src: string;
  /** Width over height. */
  aspect: number;
  service: string;
};

const id = (value: string | undefined | null) =>
  value && /^[\w-]+$/.test(value) ? value : null;

export const safeUrl = (value: unknown): URL | null => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
};

/** A web address from what someone typed: "loom.com/x" works too. */
export const normaliseUrl = (value: string) => {
  const text = value.trim();
  if (!text) return null;
  return safeUrl(/^https?:\/\//i.test(text) ? text : `https://${text}`)?.href;
};

export function embedPlayer(src: unknown): EmbedPlayer | null {
  const url = safeUrl(src);
  if (!url) return null;
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const shorts = parts[0] === 'shorts';
    const video =
      url.searchParams.get('v') ??
      (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null);
    if (id(video))
      return {
        src: `https://www.youtube-nocookie.com/embed/${video}`,
        aspect: shorts ? 9 / 16 : 16 / 9,
        service: 'YouTube',
      };
  }
  if (host === 'youtu.be' && id(parts[0]))
    return {
      src: `https://www.youtube-nocookie.com/embed/${parts[0]}`,
      aspect: 16 / 9,
      service: 'YouTube',
    };
  if (host === 'vimeo.com' && /^\d+$/.test(parts[0] ?? ''))
    return {
      src: `https://player.vimeo.com/video/${parts[0]}`,
      aspect: 16 / 9,
      service: 'Vimeo',
    };
  if (
    host === 'loom.com' &&
    ['share', 'embed'].includes(parts[0]) &&
    id(parts[1])
  )
    return {
      src: `https://www.loom.com/embed/${parts[1]}`,
      aspect: 16 / 9,
      service: 'Loom',
    };
  if (
    host === 'figma.com' &&
    ['file', 'design', 'proto', 'board'].includes(parts[0])
  )
    return {
      src: `https://www.figma.com/embed?embed_host=portal&url=${encodeURIComponent(url.href)}`,
      aspect: 16 / 10,
      service: 'Figma',
    };
  if (
    host === 'docs.google.com' &&
    ['document', 'spreadsheets', 'presentation', 'forms'].includes(parts[0]) &&
    parts[1] === 'd' &&
    id(parts[2])
  )
    return {
      src: `https://docs.google.com/${parts[0]}/d/${parts[2]}/${parts[0] === 'forms' ? 'viewform?embedded=true' : 'preview'}`,
      aspect: parts[0] === 'presentation' ? 16 / 9.6 : 4 / 3.4,
      service: 'Google',
    };
  if (host === 'drive.google.com' && parts[0] === 'file' && id(parts[2]))
    return {
      src: `https://drive.google.com/file/d/${parts[2]}/preview`,
      aspect: 16 / 10,
      service: 'Google Drive',
    };
  if (
    host === 'open.spotify.com' &&
    ['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(
      parts[0],
    ) &&
    id(parts[1])
  )
    return {
      src: `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`,
      aspect: parts[0] === 'track' || parts[0] === 'episode' ? 5 : 16 / 11,
      service: 'Spotify',
    };
  if (
    host === 'codepen.io' &&
    id(parts[0]) &&
    parts[1] === 'pen' &&
    id(parts[2])
  )
    return {
      src: `https://codepen.io/${parts[0]}/embed/${parts[2]}?default-tab=result`,
      aspect: 16 / 10,
      service: 'CodePen',
    };
  if (
    host === 'miro.com' &&
    parts[0] === 'app' &&
    parts[1] === 'board' &&
    /^[\w=-]+$/.test(parts[2] ?? '')
  )
    return {
      src: `https://miro.com/app/live-embed/${parts[2]}/`,
      aspect: 16 / 10,
      service: 'Miro',
    };
  return null;
}
