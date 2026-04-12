import { useEffect, useState } from 'react';

export function useAnimatedNumber(end: number, duration: number = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    const initialValue = value;
    const distance = end - initialValue;

    if (distance === 0) {
      setValue(end);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutExpo easing function for premium smooth deceleration
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setValue(initialValue + distance * easeProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration]);

  return value;
}
