'use client';

interface Props {
  className?: string;
  showMolecule?: boolean;
}

/**
 * The PEPTIDEX "PX" monogram with the peptide-ring molecule motif,
 * rebuilt as clean vector so it stays razor-sharp at any scale.
 */
export function PXMark({ className = '', showMolecule = true }: Props) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={className}
      role="img"
      aria-label="PEPTIDEX PX mark"
    >
      {showMolecule && (
        <g stroke="currentColor" strokeWidth="2.4" fill="none" opacity="0.9">
          <path d="M18 34 L30 27 L42 34 L42 48 L30 55 L18 48 Z" />
          <line x1="30" y1="55" x2="30" y2="70" />
          <circle cx="18" cy="34" r="4.2" fill="currentColor" />
          <circle cx="42" cy="34" r="4.2" fill="currentColor" />
          <circle cx="18" cy="48" r="4.2" fill="currentColor" />
          <circle cx="42" cy="48" r="4.2" fill="currentColor" />
          <circle cx="30" cy="70" r="4.6" fill="currentColor" />
        </g>
      )}
      {/* P */}
      <path
        d="M46 18 H70 a17 17 0 0 1 0 34 H58 V82 H46 Z M58 30 V40 H68 a5 5 0 0 0 0 -10 Z"
        fill="currentColor"
      />
      {/* X */}
      <path
        d="M78 18 H92 L100 34 L108 18 H122 L108 50 L122 82 H108 L100 66 L92 82 H78 L92 50 Z"
        fill="currentColor"
        transform="translate(-8,0)"
      />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-display font-semibold tracking-[0.14em] ${className}`}
    >
      PEPTIDEX
    </span>
  );
}
