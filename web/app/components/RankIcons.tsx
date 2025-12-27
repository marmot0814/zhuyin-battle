import React from 'react';
import { getRankInfo } from '../../lib/utils';

interface RankIconProps {
  rating: number;
  size?: number;
  className?: string;
}

export default function RankIcon({ rating, size = 48, className = '' }: RankIconProps) {
  const { name } = getRankInfo(rating);

  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    className: `drop-shadow-lg ${className}`,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  };

  switch (name) {
    case 'IRON':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="ironGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="100%" stopColor="#3f3f46" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="url(#ironGrad)" stroke="#27272a" strokeWidth="4" />
          <circle cx="50" cy="50" r="30" stroke="#52525b" strokeWidth="2" opacity="0.5" />
        </svg>
      );
    case 'BRONZE':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>
          <path d="M50 10 L85 30 L75 85 L50 95 L25 85 L15 30 Z" fill="url(#bronzeGrad)" stroke="#451a03" strokeWidth="4" />
          <path d="M50 20 L75 35 L68 78 L50 85 L32 78 L25 35 Z" stroke="#92400e" strokeWidth="2" opacity="0.5" />
        </svg>
      );
    case 'SILVER':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e4e4e7" />
              <stop offset="100%" stopColor="#a1a1aa" />
            </linearGradient>
          </defs>
          <path d="M50 5 L90 25 L80 85 L50 95 L20 85 L10 25 Z" fill="url(#silverGrad)" stroke="#52525b" strokeWidth="4" />
          <path d="M50 15 L80 30 L72 78 L50 85 L28 78 L20 30 Z" stroke="#d4d4d8" strokeWidth="2" opacity="0.5" />
        </svg>
      );
    case 'GOLD':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M50 2 L95 25 L85 90 L50 98 L15 90 L5 25 Z" fill="url(#goldGrad)" stroke="#854d0e" strokeWidth="4" filter="url(#glow)" />
          <path d="M50 15 L82 32 L75 82 L50 88 L25 82 L18 32 Z" stroke="#fef08a" strokeWidth="2" opacity="0.6" />
          <circle cx="50" cy="50" r="15" fill="#fef08a" opacity="0.3" />
        </svg>
      );
    case 'PLATINUM':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="platGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          <path d="M50 2 L95 20 L85 85 L50 98 L15 85 L5 20 Z" fill="url(#platGrad)" stroke="#164e63" strokeWidth="4" />
          <path d="M50 15 L80 30 L75 75 L50 85 L25 75 L20 30 Z" stroke="#a5f3fc" strokeWidth="2" opacity="0.6" />
          <path d="M50 30 L70 50 L50 70 L30 50 Z" fill="#ecfeff" opacity="0.4" />
        </svg>
      );
    case 'DIAMOND':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <path d="M50 5 L90 35 L50 95 L10 35 Z" fill="url(#diamondGrad)" stroke="#1e3a8a" strokeWidth="4" />
          <path d="M50 20 L75 40 L50 80 L25 40 Z" fill="#bfdbfe" opacity="0.3" />
          <path d="M50 5 L90 35 M50 95 L90 35 M50 95 L10 35 M50 5 L10 35" stroke="#93c5fd" strokeWidth="1" />
        </svg>
      );
    case 'MASTER':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="masterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d8b4fe" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>
            <filter id="masterGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Outer Star */}
          <path d="M50 5 L63 35 L95 35 L70 55 L80 85 L50 70 L20 85 L30 55 L5 35 L37 35 Z" fill="url(#masterGrad)" stroke="#4c1d95" strokeWidth="2" filter="url(#masterGlow)" />
          {/* Inner Detail */}
          <path d="M50 25 L58 42 L75 42 L62 52 L67 68 L50 60 L33 68 L38 52 L25 42 L42 42 Z" fill="#f3e8ff" opacity="0.5" />
          <circle cx="50" cy="50" r="8" fill="#ffffff" />
        </svg>
      );
    case 'GRANDMASTER':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="gmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="gmGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <filter id="gmGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Winged Shield Base */}
          <path d="M50 95 L20 75 L20 25 L50 10 L80 25 L80 75 Z" fill="url(#gmGrad)" stroke="#450a0a" strokeWidth="3" filter="url(#gmGlow)" />
          
          {/* Golden Wings/Accents */}
          <path d="M20 25 C 5 25, 5 55, 20 55" fill="none" stroke="url(#gmGold)" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 25 C 95 25, 95 55, 80 55" fill="none" stroke="url(#gmGold)" strokeWidth="4" strokeLinecap="round" />
          
          {/* Center Gem */}
          <path d="M50 30 L65 50 L50 75 L35 50 Z" fill="url(#gmGold)" stroke="#78350f" strokeWidth="2" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" opacity="0.8" />
          
          {/* Crown Top */}
          <path d="M35 25 L35 10 L50 0 L65 10 L65 25" fill="none" stroke="url(#gmGold)" strokeWidth="3" />
        </svg>
      );
    default:
      return null;
  }
}
