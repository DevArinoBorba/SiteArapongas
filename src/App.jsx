import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StoreFront from './pages/StoreFront';
import AdminPanel from './pages/AdminPanel';
import ClubRegistration from './pages/ClubRegistration';
import ReloadPrompt from './components/ReloadPrompt';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StoreFront />} />
        <Route path="/paineldecontrole" element={<AdminPanel />} />
        <Route path="/clube" element={<ClubRegistration />} />
      </Routes>
      <ReloadPrompt />
    </BrowserRouter>
  );
}

export default App;
