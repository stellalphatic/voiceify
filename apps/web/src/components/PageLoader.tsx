/**
 * PageLoader.tsx — minimal full-screen loader shown while a lazy-loaded route
 * chunk is being fetched. Theme-aware via CSS variables.
 */
export default function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary, #f5f5f4)',
        color: 'var(--color-text-secondary, #4e4a46)',
        fontFamily: 'Inter, system-ui, sans-serif',
        gap: 14,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          animation: 'voiceify-loader-spin 0.7s linear infinite',
          opacity: 0.7,
        }}
      />
      <span style={{ fontSize: 13, letterSpacing: 0.04, textTransform: 'uppercase' }}>Loading</span>
      <style>{`@keyframes voiceify-loader-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
