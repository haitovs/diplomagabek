import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { I18nProvider } from './context/I18nContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
