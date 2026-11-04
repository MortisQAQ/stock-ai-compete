import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/chrome/AppShell'
import { StudioPage } from './routes/StudioPage'
import { TrainingPage } from './routes/TrainingPage'
import { ReviewPage } from './routes/ReviewPage'
import { ConnectPage } from './routes/ConnectPage'
import { ProtocolPage } from './routes/ProtocolPage'
import { GuidePage } from './routes/GuidePage'
import { RunProvider } from './store/RunProvider'
import { DialogProvider } from './store/DialogProvider'

export default function App() {
  return (
    <RunProvider>
      <DialogProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/studio" element={<StudioPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/connect" element={<ConnectPage />} />
              <Route path="/protocol" element={<ProtocolPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="*" element={<Navigate to="/studio" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </DialogProvider>
    </RunProvider>
  )
}
