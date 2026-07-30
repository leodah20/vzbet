import { useId } from 'react'

interface TeamCrestProps {
  teamName: string
  size?: number
}

export function TeamCrest({ teamName, size = 40 }: TeamCrestProps) {
  const rawId = useId()
  const gradientId = `crest-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const initials = teamName
    .replace(/[^a-zA-Z0-9À-ÿ]/g, '')
    .slice(0, 2)
    .toUpperCase()

  return (
    <svg
      viewBox="0 0 48 56"
      width={size}
      height={Math.round(size * (56 / 48))}
      role="img"
      aria-label={`Escudo de ${teamName}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 L44 8 V26 C44 40 36 50 24 54 C12 50 4 40 4 26 V8 Z"
        fill={`url(#${gradientId})`}
        stroke="#ffffff"
        strokeWidth="2"
      />
      <path
        d="M24 6 L40 11 V26 C40 37 34 45 24 49 C14 45 8 37 8 26 V11 Z"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1"
      />
      <text
        x="24"
        y="33"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, sans-serif"
      >
        {initials}
      </text>
    </svg>
  )
}
