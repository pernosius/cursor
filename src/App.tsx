import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useCharacters } from './store/characters';
import { startSync } from './sync/engine';
import Home from './pages/Home';
import NewCharacter from './pages/NewCharacter';
import Sheet from './pages/Sheet';
import Settings from './pages/Settings';
import Compendium from './pages/Compendium';
import Toasts from './components/Toasts';
import DiceRoller from './components/DiceRoller';

export default function App() {
  const ready = useCharacters((s) => s.ready);
  useEffect(() => {
    void useCharacters.getState().load().then(startSync);
  }, []);

  return (
    <HashRouter>
      <div className="ambient" />
      <div className="app">
        {ready ? (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewCharacter />} />
            <Route path="/c/:id" element={<Sheet />} />
            <Route path="/c/:id/:tab" element={<Sheet />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/compendium" element={<Compendium />} />
            <Route path="*" element={<Home />} />
          </Routes>
        ) : null}
      </div>
      <DiceRoller />
      <Toasts />
    </HashRouter>
  );
}
