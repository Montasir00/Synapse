import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canTrigger, setCanTrigger] = useState(false);
  const y = useMotionValue(0);
  const touchStartY = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  // Caps the pull distance with progressive elastic resistance
  const yElastic = useTransform(y, [0, 150], [0, 80]);
  const rotate = useTransform(y, [0, 80], [0, 360]);
  const opacity = useTransform(y, [0, 50, 80], [0, 0.4, 1]);

  useEffect(() => {
    const unsubscribe = yElastic.on('change', (latest) => {
      if (latest >= 65 && !canTrigger && !isRefreshing) {
        setCanTrigger(true);
        haptics.light();
      } else if (latest < 65 && canTrigger) {
        setCanTrigger(false);
      }
    });
    return () => unsubscribe();
  }, [yElastic, canTrigger, isRefreshing]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only allow pull-to-refresh when at the absolute top of the page
    if (window.scrollY <= 1) {
      touchStartY.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || !isPullingRef.current || touchStartY.current === null) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // If dragging downward at the top of the viewport
    if (deltaY > 0 && window.scrollY <= 1) {
      // Prevent standard browser bounce/overflow scroll
      if (e.cancelable) {
        e.preventDefault();
      }
      y.set(deltaY);
    } else if (deltaY < 0) {
      // If dragging upward, let the default scroll handle it
      isPullingRef.current = false;
      y.set(0);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing || touchStartY.current === null) {
      touchStartY.current = null;
      isPullingRef.current = false;
      return;
    }

    const currentY = yElastic.get();
    touchStartY.current = null;
    isPullingRef.current = false;

    if (currentY >= 65) {
      setIsRefreshing(true);
      haptics.medium();
      y.set(120); // Hold at active spinner offset

      try {
        await onRefresh();
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setCanTrigger(false);
        y.set(0);
      }
    } else {
      y.set(0);
    }
  };

  return (
    <div 
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Visual Refresh Indicator */}
      <motion.div
        style={{
          y: isRefreshing ? 55 : yElastic,
          rotate: isRefreshing ? undefined : rotate,
          opacity: isRefreshing ? 1 : opacity,
        }}
        animate={{ y: isRefreshing ? 55 : 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="absolute top-2 left-0 right-0 z-50 flex justify-center pointer-events-none"
      >
        <div className={`p-2.5 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-lg transition-all ${
          isRefreshing 
            ? 'bg-accent/15 border-accent/20 text-accent' 
            : canTrigger 
            ? 'bg-accent/10 border-accent/15 text-accent scale-110' 
            : 'bg-surface/85 border-border/80 text-muted'
        }`}>
          <Loader2 className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      </motion.div>

      {/* Main Content Container */}
      <motion.div
        style={{ y: isRefreshing ? 48 : yElastic }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full h-full min-h-[inherit]"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;

