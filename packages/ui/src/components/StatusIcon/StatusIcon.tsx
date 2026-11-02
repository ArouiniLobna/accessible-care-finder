export type StatusTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Decorative status glyphs with *different shapes* per tone (circle-i, check, triangle,
 * octagon-x), so status survives greyscale, colour-vision differences and forced colours.
 * Always paired with text; hidden from assistive technology.
 */
export function StatusIcon({
  tone,
  className,
}: {
  tone: StatusTone | 'neutral';
  className?: string | undefined;
}) {
  const common = {
    'aria-hidden': true as const,
    focusable: 'false' as const,
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (tone) {
    case 'success':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m7.5 12.5 3 3 6-6.5" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...common}>
          <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    case 'danger':
      return (
        <svg {...common}>
          <path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z" />
          <path d="m15 9-6 6M9 9l6 6" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
    case 'neutral':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}
