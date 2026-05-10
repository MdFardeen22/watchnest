import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { socket, API_URL } from '../config/api.js';

const SocketContext = createContext(undefined);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
      console.info('[socket connected]', { id: socket.id, url: API_URL });
    }

    function handleConnectError(error) {
      setConnected(false);
      console.error('[socket connect_error]', error?.message ?? error);
    }

    function handleDisconnect(reason) {
      setConnected(false);
      console.info('[socket disconnected]', reason);
    }

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  const value = useMemo(() => ({ socket, connected }), [connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const socketState = useContext(SocketContext);
  if (socketState === undefined) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return socketState;
}
