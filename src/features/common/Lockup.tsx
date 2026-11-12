/**
 * Tome & Delve lockup (plan item B4): an open tome with an arched stone
 * doorway rising from the gutter and a stair descending through it, an
 * oxblood wax seal, and the wordmark in Noto Serif (real text, not paths).
 * Original ink line art — the raster concept in
 * ~/workspace/your_files/4ad-art-direction/ is direction only and is never
 * shipped. Linework uses currentColor so the mark works on parchment
 * (default, `text-parchment`) or any surface the caller colours; the seal
 * stays oxblood. The two pages are drawn as separate paths that stop at the
 * arch legs, so no line passes behind the doorway.
 */
export default function Lockup({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 310"
      role="img"
      aria-label="Four Against Darkness"
      className={`text-parchment ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* open tome — left page */}
      <path d="M36 60 C 90 46, 130 48, 170 60 L170 190 C 130 174, 80 174, 36 190 Z" strokeWidth={4} />
      {/* open tome — right page */}
      <path d="M364 60 C 310 46, 270 48, 230 60 L230 190 C 270 174, 320 174, 364 190 Z" strokeWidth={4} />
      {/* page-block edges */}
      <path d="M44 198 C 90 184, 130 182, 162 190" strokeWidth={2} />
      <path d="M238 190 C 270 182, 310 184, 356 198" strokeWidth={2} />
      {/* page lines */}
      <path d="M64 86 C 104 74, 134 74, 160 82" strokeWidth={2} />
      <path d="M64 102 C 104 90, 134 90, 160 98" strokeWidth={2} />
      <path d="M240 82 C 266 74, 296 74, 336 86" strokeWidth={2} />
      <path d="M240 98 C 266 90, 296 90, 336 102" strokeWidth={2} />
      {/* arched stone doorway rising from the gutter */}
      <path d="M170 192 L170 60 A30 30 0 0 1 230 60 L230 192" strokeWidth={4} />
      <path d="M180 192 L180 60 A20 20 0 0 1 220 60 L220 192" strokeWidth={2.5} />
      {/* voussoir joints */}
      <path d="M200 30 L200 40" strokeWidth={2} />
      <path d="M221.2 38.8 L214.1 45.9" strokeWidth={2} />
      <path d="M178.8 38.8 L185.9 45.9" strokeWidth={2} />
      <path d="M230 60 L220 60" strokeWidth={2} />
      <path d="M170 60 L180 60" strokeWidth={2} />
      <path d="M170 110 L180 110" strokeWidth={2} />
      <path d="M170 150 L180 150" strokeWidth={2} />
      <path d="M220 110 L230 110" strokeWidth={2} />
      <path d="M220 150 L230 150" strokeWidth={2} />
      {/* descending stair inside the doorway */}
      <path d="M193 66 H207" strokeWidth={2.5} />
      <path d="M191 80 H209" strokeWidth={2.5} />
      <path d="M189 94 H211" strokeWidth={2.5} />
      <path d="M187 108 H213" strokeWidth={2.5} />
      <path d="M185 122 H215" strokeWidth={2.5} />
      <path d="M184 136 H216" strokeWidth={2.5} />
      <path d="M183 150 H217" strokeWidth={2.5} />
      <path d="M182 164 H218" strokeWidth={2.5} />
      <path d="M181 178 H219" strokeWidth={2.5} />
      {/* doorstep */}
      <path d="M164 192 H236" strokeWidth={3} />
      {/* wax seal with a tiny doorway */}
      <circle cx="200" cy="220" r="10" fill="#8c2626" stroke="none" />
      <path d="M196 224 L196 218 A4 4 0 0 1 204 218 L204 224" stroke="#faf6ee" strokeWidth={1.5} fill="none" />
      {/* wordmark — real text in the app display font */}
      <text
        x="200"
        y="292"
        textAnchor="middle"
        fontFamily="'Noto Serif', Georgia, serif"
        fontSize="30"
        fontWeight={700}
        fill="currentColor"
        stroke="none"
        letterSpacing="0.5"
      >
        Four Against Darkness
      </text>
    </svg>
  )
}
