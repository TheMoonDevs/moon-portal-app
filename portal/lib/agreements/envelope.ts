/*
 * How an agreement and its signatures are referred to on the signing page,
 * in emails and in the signed PDF. Safe to import from the browser.
 */

/** An agreement's id as people read it: "6730F1A2-B3C4-D5E6-F7A8B9C0". */
export const envelopeId = (id: string) => {
  const hex = id.replace(/[^0-9a-f]/gi, '').toUpperCase();
  if (hex.length < 20) return id.toUpperCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16)}`;
};

/** How a signature was made, for the certificate. */
export const signatureMethod = (sig: {
  method: 'typed' | 'drawn';
  saved?: boolean | null;
}) =>
  sig.saved
    ? 'Approved with saved signature'
    : sig.method === 'drawn'
      ? 'Drawn by hand'
      : 'Typed full name';
