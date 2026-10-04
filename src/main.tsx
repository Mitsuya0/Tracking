import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@charcoal-ui/react/dist/index.css'
import '@charcoal-ui/theme/css/v2/light.css'
import '@charcoal-ui/theme/css/v2/dark.css'
import { CharcoalProvider } from '@charcoal-ui/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharcoalProvider>
      <App />
    </CharcoalProvider>
  </StrictMode>,
)
