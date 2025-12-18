import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    setIsSupported(true);
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      // Register with APNs/FCM
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setPushToken(token.value);
        
        // Save token to database for the current user
        await savePushToken(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
      });

      // Listen for push notifications received while app is in foreground
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        
        // Show in-app notification
        toast(notification.title || 'New Notification', {
          description: notification.body,
        });
      });

      // Listen for action performed on push notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push notification action performed:', notification);
        
        // Handle notification tap - navigate based on notification data
        const data = notification.notification.data;
        if (data?.link) {
          window.location.href = data.link;
        }
      });

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const savePushToken = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user logged in, skipping push token save');
        return;
      }

      // Update the user's profile with the push token
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  return {
    pushToken,
    isSupported,
  };
};
