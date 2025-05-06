import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LotPage from "./pages/LotPage";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lot/:id" element={< LotPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
