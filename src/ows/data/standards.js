/*
  The ten bodies this index cross-references, and the specifications under each
  that actually carry filler-metal classifications.

  This is a reference list, not a claim: it says which documents a designation
  can be written against, which is the whole subject of a cross-reference
  index. It does not say that Unibraze holds an approval to any of them, and
  nothing here should be read that way.

  Every entry is a real document. Several of the DIN specifications were
  superseded by their EN ISO equivalents years ago and are kept deliberately —
  a cross-reference index is exactly where a withdrawn designation still has to
  be resolvable, because it is still stamped on the drawing in front of
  somebody. The AISI entries are type designations rather than specifications,
  and the W.Nr entries are Werkstoffnummern; both are how the same alloy gets
  written in the two systems, which is why they belong beside the others.
*/

export const STANDARDS = [
  // American Welding Society — the A5 series, filler metals by process and alloy.
  { body: 'AWS', specs: ['A5.1', 'A5.4', 'A5.9', 'A5.17', 'A5.18', 'A5.20', 'A5.28', 'A5.29'] },

  // The ASME Boiler & Pressure Vessel Code, Section II Part C: the A5 series
  // adopted verbatim, which is why the numbers match after the prefix. Written
  // SFA-5.18, not "SFA 5.18" — the hyphen is part of the designation.
  { body: 'ASME', specs: ['SFA-5.1', 'SFA-5.4', 'SFA-5.9', 'SFA-5.18', 'SFA-5.20', 'SFA-5.28'] },

  // The European system, now the international one for most of these.
  { body: 'EN ISO', specs: ['636', '2560', '3581', '14341', '14343', '17632', '18274'] },

  // German, largely superseded, still in circulation on older documentation.
  { body: 'DIN', specs: ['1913', '8555', '8556', '8559'] },

  // Japanese Industrial Standards.
  { body: 'JIS', specs: ['Z 3211', 'Z 3312', 'Z 3321', 'Z 3323'] },

  // The Chinese national standards — Guobiao.
  { body: 'CN', specs: ['GB/T 983', 'GB/T 5117', 'GB/T 5118', 'GB/T 8110'] },

  // Werkstoffnummer: the German material number for the same alloys.
  { body: 'W.Nr', specs: ['1.4316', '1.4370', '1.4430', '1.4551'] },

  // Type designations rather than documents, and the way most shops say it.
  { body: 'AISI', specs: ['308L', '309L', '316L', '347', '410'] },

  // The Canadian Welding Bureau is the certifying body, not the standard: what
  // it certifies against is the CSA W series, so both are named.
  { body: 'CWB', specs: ['CSA W48', 'CSA W47.1', 'CSA W59'] },

  // Test methods rather than classifications — how the chemistry behind a
  // classification is actually verified.
  { body: 'ASTM', specs: ['A751', 'E353'] },
]

/**
 * Every body/spec pair as a flat list, which is what a display wants.
 * `body` and `spec` stay separate so the two can be set in different inks.
 */
export const STANDARD_REFS = STANDARDS.flatMap(({ body, specs }) =>
  specs.map((spec) => ({ body, spec })),
)
