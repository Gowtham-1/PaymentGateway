import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MerchantView from './components/views/MerchantView';
import StandbyView from './components/views/StandbyView';
import LoginView from './components/views/LoginView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MerchantView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/standby" element={<StandbyView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
