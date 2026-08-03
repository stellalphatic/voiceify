/**
 * The Voiceify waveform mark. Geometry is kept in sync with the favicon in
 * `index.html` so the brand reads identically in the tab, navbar, and sidebar.
 */
export default function VoiceifyMark({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 16h2M9 11v10M13 7v18M16 5v22M19 7v18M23 11v10M26 16h2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
