import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { Login } from './pages/Login';
import { PaletteDetail } from './pages/PaletteDetail';
import { Compose } from './pages/Compose';
import { Pattern } from './pages/Pattern';
import { Scratch } from './pages/Scratch';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/pattern" element={<Pattern />} />
          <Route path="/scratch" element={<Scratch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/palette/:id" element={<PaletteDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
