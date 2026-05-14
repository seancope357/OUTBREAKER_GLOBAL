// Audio utility for native browser notifications

let audioInstance: HTMLAudioElement | null = null;

export const playUrgentAlert = () => {
  // Using a soft interface beep for the alert.
  // In a production app, this would point to a local asset or a more specific alarm tone.
  if (!audioInstance) {
    audioInstance = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }
  
  audioInstance.currentTime = 0;
  audioInstance.play().catch((err) => {
    console.warn("Audio playback blocked by browser auto-play policy:", err);
  });
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendPushNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
    playUrgentAlert();
  }
};
