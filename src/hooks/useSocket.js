import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (url = 'http://localhost:5000') => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(url);

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url]);

  return socketRef.current;
};

