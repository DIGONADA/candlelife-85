
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useGlobalChatListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOpenChat = (event: CustomEvent) => {
      const { userId } = event.detail;
      console.log('📱 Opening chat for user:', userId);
      
      // Navigate to social page and open chat
      navigate('/social', { state: { openChatUserId: userId } });
    };

    window.addEventListener('openChat', handleOpenChat as EventListener);

    return () => {
      window.removeEventListener('openChat', handleOpenChat as EventListener);
    };
  }, [navigate]);
};
