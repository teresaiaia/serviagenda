import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CalendarioView from './components/CalendarioView';
import EquiposView from './components/EquiposView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/calendario" replace />} />
        <Route path="/calendario" element={<CalendarioView />} />
        <Route path="/equipos" element={<EquiposView />} />
        <Route path="/clientes" element={<Navigate to="/calendario" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
