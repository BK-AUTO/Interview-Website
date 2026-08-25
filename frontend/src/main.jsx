import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ConfirmParticipation from './pages/ConfirmParticipation.jsx';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import theme from './theme.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          {/* Public — no Authentik login, reached only via the private
              MSSV-token link the admin sends after screening approval. */}
          <Route path="/confirm/:token" element={<ConfirmParticipation />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>
);
