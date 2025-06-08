
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useGlobalChatListener = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOpenChat = (event: CustomEvent) => {
      const { userId, userName, userAvatar } = event.detail;
      
      console.log('📱 Global chat listener - Opening chat for user:', {
        userId,
        userName,
        userAvatar,
        currentPath: location.pathname
      });
      
      // Ensure we have the required data
      if (!userId) {
        console.error('❌ Missing userId in chat event');
        return;
      }

      // Prepare the state data for navigation
      const navigationState = {
        username: userName || 'Usuário',
        avatar_url: userAvatar || null
      };
      
      // Check current location to determine navigation strategy
      const currentPath = location.pathname;
      
      if (currentPath.startsWith('/chat/')) {
        // Already in a chat conversation, navigate directly
        console.log('📱 Navigating from chat conversation to another');
        navigate(`/chat/${userId}`, { 
          state: navigationState,
          replace: true
        });
      } else if (currentPath === '/chat') {
        // In chat list, navigate to conversation
        console.log('📱 Navigating from chat list to conversation');
        navigate(`/chat/${userId}`, { 
          state: navigationState
        });
      } else if (currentPath === '/social') {
        // In social page, stay and open chat modal
        console.log('📱 Opening chat modal in social page');
        const socialEvent = new CustomEvent('openSocialChat', {
          detail: { userId, userName, userAvatar }
        });
        window.dispatchEvent(socialEvent);
      } else {
        // Navigate to chat conversation from any other page
        console.log('📱 Navigating from other page to chat conversation');
        navigate(`/chat/${userId}`, { 
          state: navigationState
        });
      }
    };

    console.log('📱 Setting up global chat listener');
    window.addEventListener('openChat', handleOpenChat as EventListener);

    return () => {
      console.log('📱 Cleaning up global chat listener');
      window.removeEventListener('openChat', handleOpenChat as EventListener);
    };
  }, [navigate, location.pathname]);
};
