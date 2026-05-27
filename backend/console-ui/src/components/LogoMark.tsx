type Props = { variant?: 'light' | 'dark' };

export function LogoMark({ variant = 'dark' }: Props) {
  const circleFill = variant === 'light' ? 'rgba(255,255,255,0.15)' : '#1a5c38';
  return (
    <div className="logo-mark" aria-hidden>
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" fill={circleFill} />
        <path
          d="M20 8c-4 8-8 10-8 14a8 8 0 1016 0c0-4-4-6-8-14z"
          fill="#7dd87a"
        />
        <circle cx="20" cy="22" r="3" fill="#fff" />
      </svg>
    </div>
  );
}
