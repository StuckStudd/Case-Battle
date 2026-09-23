import { useId, useState } from 'react';
import { RARITIES } from '../data/rarities';
import type { Skin, WeaponCategory } from '../types/types';
import { cx } from '../utils/ui';

/** Stylized silhouettes on a 200x100 canvas. */
const SILHOUETTES: Record<WeaponCategory, string[]> = {
  rifle: [
    'M6 44 L18 40 L52 42 L58 38 L138 38 L140 35 L150 35 L150 38 L196 38 L196 43 L150 44 L146 47 L118 47 L122 50 L110 72 L100 70 L106 50 L90 50 L86 60 L78 60 L80 50 L60 50 L40 52 L22 62 L8 60 Z',
  ],
  sniper: [
    'M4 46 L20 40 L56 42 L60 38 L124 38 L124 44 L198 42 L198 46 L124 48 L112 50 L96 50 L92 64 L82 64 L84 50 L60 52 L36 54 L18 62 L6 60 Z',
    'M66 28 Q66 24 70 24 L114 24 Q118 24 118 28 L118 30 Q118 34 114 34 L100 34 L100 38 L84 38 L84 34 L70 34 Q66 34 66 30 Z',
  ],
  pistol: [
    'M44 30 L156 30 L158 34 L158 46 L100 46 L98 50 L92 52 L88 50 L86 54 L80 80 L58 80 L64 50 L60 46 L44 46 Z',
  ],
  smg: [
    'M20 42 L40 40 L60 40 L62 36 L140 36 L142 40 L172 40 L172 46 L140 46 L136 50 L112 50 L114 76 L102 76 L100 50 L88 50 L84 64 L74 64 L76 50 L56 50 L36 54 L22 56 Z',
  ],
  shotgun: [
    'M6 46 L22 40 L56 42 L62 40 L196 40 L196 45 L128 46 L128 50 L150 50 L150 55 L100 55 L100 50 L92 50 L88 62 L78 62 L80 50 L60 52 L38 54 L20 62 L8 60 Z',
  ],
  machinegun: [
    'M6 44 L20 40 L54 42 L60 36 L146 36 L146 40 L196 40 L196 45 L146 46 L140 48 L126 48 L126 72 L100 72 L100 48 L90 48 L86 60 L76 60 L78 48 L60 50 L38 52 L20 62 L8 60 Z',
  ],
  knife: [
    'M14 56 Q10 50 16 46 L70 46 L78 42 L84 42 L84 46 L96 46 Q150 40 192 26 Q178 56 120 64 L84 64 L84 68 L78 68 L72 62 L16 64 Q10 62 14 56 Z',
  ],
  gloves: [
    'M50 86 L50 52 Q50 44 58 42 L60 22 Q60 16 66 16 Q72 16 72 22 L72 40 L76 40 L76 14 Q76 8 82 8 Q88 8 88 14 L88 40 L92 40 L92 16 Q92 10 98 10 Q104 10 104 16 L104 42 L108 42 L108 24 Q108 18 114 18 Q120 18 120 24 L120 58 L132 44 Q138 38 144 44 Q148 48 144 54 L122 84 L118 92 L54 92 Z',
  ],
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function GeneratedArt({ skin }: { skin: Skin }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [primary, secondary] = skin.colors;
  const rarityColor = RARITIES[skin.rarity].color;
  const paths = SILHOUETTES[skin.category];
  const seed = hashString(skin.id);
  const angle = seed % 180;
  const stripe = 6 + (seed % 7);

  return (
    <svg viewBox="0 0 200 100" className="h-full w-full" role="img" aria-label={skin.name}>
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1" gradientTransform={`rotate(${angle % 60} .5 .5)`}>
          <stop offset="0" stopColor={primary} />
          <stop offset="1" stopColor={secondary} />
        </linearGradient>
        <radialGradient id={`r${uid}`}>
          <stop offset="0" stopColor={rarityColor} stopOpacity="0.55" />
          <stop offset="1" stopColor={rarityColor} stopOpacity="0" />
        </radialGradient>
        <pattern id={`p${uid}`} width={stripe * 2} height={stripe * 2} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
          <rect width={stripe} height={stripe * 2} fill="#fff" opacity="0.09" />
        </pattern>
        <clipPath id={`c${uid}`}>
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </clipPath>
      </defs>
      <ellipse cx="100" cy="52" rx="92" ry="40" fill={`url(#r${uid})`} />
      <ellipse cx="100" cy="90" rx="62" ry="4" fill="#000" opacity="0.45" />
      <g clipPath={`url(#c${uid})`}>
        <rect width="200" height="100" fill={`url(#g${uid})`} />
        <rect width="200" height="100" fill={`url(#p${uid})`} />
        <circle cx={40 + (seed % 120)} cy={30 + (seed % 30)} r={14 + (seed % 12)} fill={secondary} opacity="0.55" />
        <circle cx={160 - (seed % 90)} cy={60 - (seed % 20)} r={8 + (seed % 10)} fill="#fff" opacity="0.18" />
        <rect y="0" width="200" height="40" fill="#fff" opacity="0.1" />
      </g>
      {paths.map((d) => (
        <path key={d} d={d} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

interface SkinImageProps {
  skin: Skin;
  className?: string;
}

/** Renders `skin.image` when provided, otherwise (or on load failure) a generated artwork. */
export function SkinImage({ skin, className }: SkinImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const useRemote = !!skin.image && !failed;

  return (
    <div className={cx('relative flex items-center justify-center drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]', className)}>
      {useRemote ? (
        <>
          {!loaded && <div className="skeleton absolute inset-2 rounded-xl" />}
          <img
            src={skin.image ?? undefined}
            alt={skin.name}
            loading="lazy"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cx('h-full w-full object-contain transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
          />
        </>
      ) : (
        <GeneratedArt skin={skin} />
      )}
    </div>
  );
}
