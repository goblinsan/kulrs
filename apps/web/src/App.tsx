import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { PaletteDetail } from './pages/PaletteDetail';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/palette/:id" element={<PaletteDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
