import { useEffect, useRef, useState } from 'react';

export function useNotification() {
  const [notificationCount, setNotificationCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on user interaction (optional, but good practice)
  // However, for notifications, we often want them to play even if user hasn't interacted recently,
  // but browsers block audio until first interaction.
  // We'll try to create it lazily.

  const playSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // "Ding Ding Ding" - 3 high pitched notes
      [0, 0.15, 0.3].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Brighter sound: sine wave at high frequency
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1568, now + offset); // G6
        
        // Bell-like envelope
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.1, now + offset + 0.02); // Quick attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.3); // Decay

        osc.start(now + offset);
        osc.stop(now + offset + 0.3);
      });
    } catch (e) {
      console.error('Failed to play notification sound:', e);
    }
  };

  const updateTitle = (count: number) => {
    setNotificationCount(count);
    const baseTitle = '精靈語對戰';
    if (count > 0) {
      document.title = `(${count}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  };

  // Reset count when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      updateTitle(0);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return {
    playSound,
    updateTitle,
    notificationCount
  };
}
