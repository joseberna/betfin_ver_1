// client/src/components/routing/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PokerPlay from '../../pages/play/PokerPlay';
import BlackjackPlay from '../../pages/play/BlackjackPlay';
import Lobby from '../../pages/Lobby';
import NotFoundPage from '../../pages/NotFoundPage';
import ConnectWallet from '../../pages/ConnectWallet';
import { useAccount } from 'wagmi';

const Protected = ({ children }) => {
  const { isConnected } = useAccount();
  return isConnected ? children : <Navigate to="/" replace />;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ConnectWallet />} />
      <Route path="/lobby" element={<Protected><Lobby /></Protected>} />
      <Route path="/play/poker" element={<Protected><PokerPlay /></Protected>} />
      <Route path="/play/blackjack" element={<Protected><BlackjackPlay /></Protected>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
