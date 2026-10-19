import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './osce/fonts/offline-fonts.css';
import {Theme} from '@astryxdesign/core/theme';
import {caseLabTheme} from './theme';
import {OsceApp} from './osce/OsceApp';

// Stand-alone entry for the single-file offline build (osce.html → offline/OSCE-Clinic.html).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={caseLabTheme} mode="dark">
      <OsceApp />
    </Theme>
  </StrictMode>,
);
