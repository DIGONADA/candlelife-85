
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useGlobalChatListener = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOpenChat = (event: CustomEvent) => {
      const { userId, userName, userAvatar } = event.detail;
      console.log('📱 Opening chat for user:', userId);
      
      // Check current location to determine navigation strategy
      const currentPath = location.pathname;
      
      if (currentPath.startsWith('/chat/')) {
        // Already in a chat conversation, navigate directly
        navigate(`/chat/${userId}`, { 
          state: { 
            username: userName,
            avatar_url: userAvatar 
          } 
        });
      } else if (currentPath === '/chat') {
        // In chat list, navigate to conversation
        navigate(`/chat/${userId}`, { 
          state: { 
            username: userName,
            avatar_url: userAvatar 
          } 
        });
      } else if (currentPath === '/social') {
        // In social page, stay and open chat modal
        // This will be handled by the social page components
        const socialEvent = new CustomEvent('openSocialChat', {
          detail: { userId, userName, userAvatar }
        });
        window.dispatchEvent(socialEvent);
      } else {
        // Navigate to chat conversation from any other page
        navigate(`/chat/${userId}`, { 
          state: { 
            username: userName,
            avatar_url: userAvatar 
          } 
        });
      }
    };

    window.addEventListener('openChat', handleOpenChat as EventListener);

    return () => {
      window.removeEventListener('openChat', handleOpenChat as EventListener);
    };
  }, [navigate, location.pathname]);
};
