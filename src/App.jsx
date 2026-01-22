import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { CrashGame, HomePage } from './components/index.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game" element={<CrashGame />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
