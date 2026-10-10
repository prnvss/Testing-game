import {defineTheme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from './astryx-themes';

/**
 * "Mission control" theme: near-black space, NASA red-orange accent, plum /
 * navy / umber tinted cards and an amber highlight — extending Gothic.
 */
export const caseLabTheme = defineTheme({
  name: 'case-lab',
  extends: themes[defaultThemeSlug],
  tokens: {
    '--color-accent': '#E8461E',
    '--color-accent-muted': '#E8461E2E',
    '--color-text-accent': '#FF7A52',
    '--color-icon-accent': '#FF6A3D',
    '--color-on-accent': '#FFFFFF',
    '--color-background-body': '#06070B',
    '--color-background-surface': '#06070B',
    '--color-background-card': '#13141B',
    '--color-background-muted': '#191B24',
    '--color-background-popover': '#1E2029',
    '--color-text-primary': '#F4F2F0',
    '--color-text-secondary': '#9C9FAB',
    '--color-border': '#FFFFFF14',
    '--color-border-emphasized': '#3A3D4A',
    '--color-success': '#3FBF7F',
    '--color-success-muted': '#3FBF7F',
    '--color-warning': '#F6B65E',
    '--color-warning-muted': '#F6B65E',
    '--color-error': '#E8461E',
    '--color-error-muted': '#E8461E',
  },
  localTokens: {
    // Space backdrop: scattered stars over a faint plum/rust nebula.
    '--cl-space':
      'radial-gradient(1px 1px at 12% 18%, #ffffffaa 50%, transparent 51%), radial-gradient(1px 1px at 72% 12%, #ffffff88 50%, transparent 51%), radial-gradient(1.5px 1.5px at 38% 64%, #8fb4ff99 50%, transparent 51%), radial-gradient(1px 1px at 88% 42%, #ffffff77 50%, transparent 51%), radial-gradient(1px 1px at 56% 88%, #ffffff66 50%, transparent 51%), radial-gradient(1.5px 1.5px at 22% 82%, #8fb4ff88 50%, transparent 51%), radial-gradient(1px 1px at 94% 76%, #ffffff77 50%, transparent 51%), radial-gradient(1px 1px at 6% 46%, #ffffff66 50%, transparent 51%), radial-gradient(1px 1px at 63% 36%, #ffffff55 50%, transparent 51%), radial-gradient(1px 1px at 47% 9%, #8fb4ff77 50%, transparent 51%), radial-gradient(60% 50% at 70% 110%, #5a1a0c55, transparent 70%), radial-gradient(50% 40% at 15% -10%, #4a133f55, transparent 70%), #06070B',
    '--cl-tint-graphite': 'linear-gradient(160deg, #23242B 0%, #121318 70%)',
    '--cl-tint-plum': 'linear-gradient(160deg, #3A1030 0%, #160A14 75%)',
    '--cl-tint-navy': 'linear-gradient(160deg, #132347 0%, #0B1020 75%)',
    '--cl-tint-umber': 'linear-gradient(160deg, #3A2414 0%, #17110B 75%)',
    '--cl-glass': 'linear-gradient(160deg, #1D1E26E6 0%, #101118E6 100%)',
    '--cl-plum': '#6B2259',
    '--cl-plum-strong': '#8A2B73',
    '--cl-amber': 'linear-gradient(135deg, #FFD27A 0%, #F59A4C 100%)',
    '--cl-amber-ink': '#3A1A05',
    '--cl-rust': '#E8461E',
    '--cl-hero-glow': 'radial-gradient(closest-side, #E8461E40, #7A1E5F22 55%, transparent 100%)',
    '--cl-area': '#8A2B73',
    '--cl-navy-ring': '#3E6FD8',
    '--cl-grid-line': '#FFFFFF12',
    '--cl-display-size': 'clamp(56px, 7vw, 112px)',
  },
});
