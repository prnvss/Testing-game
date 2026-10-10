import {defineTheme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from './astryx-themes';

/**
 * Imaging-workstation theme: Gothic's dark blue-grays, pushed towards the
 * navy of a PACS/OCT viewer, with a cyan accent for tools and selections.
 */
export const caseLabTheme = defineTheme({
  name: 'case-lab',
  extends: themes[defaultThemeSlug],
  tokens: {
    '--color-accent': '#4FD1E8',
    '--color-accent-muted': '#4FD1E826',
    '--color-text-accent': '#7FE0F0',
    '--color-icon-accent': '#4FD1E8',
    '--color-on-accent': '#04161B',
    '--color-background-body': '#0A1117',
    '--color-background-surface': '#0A1117',
    '--color-background-card': '#101A22',
    '--color-background-muted': '#14212B',
    '--color-background-popover': '#1A2934',
    '--color-border': '#9FC3D61F',
    '--color-border-emphasized': '#36505F',
    '--color-success': '#7FD6A4',
    '--color-success-muted': '#7FD6A4',
    '--color-warning': '#E9C46A',
    '--color-warning-muted': '#E9C46A',
    '--color-error': '#F08A7E',
    '--color-error-muted': '#F08A7E',
  },
});
