/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'motion/react';
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
  const controls = useAnimation();

  // Caps the drag distance, making it feel progressively heavier (elastic limit)
  const yElastic = useTransform(y, [0, 150], [0, 80]);

  // Rotate the spinner as the user pulls down
  const rotate = useTransform(y, [0, 80], [0, 360]);

  // Opacity of the spinner
  const opacity = useTransform(y, [0, 50, 80], [0, 0.4, 1]);

  useEffect(() => {
    const unsubscribe = yElastic.on('change', (latest) => {
      if (latest >= 65 && !canTrigger && !isRefreshing) {
        setCanTrigger(true);
        haptics.light(); // Trigger subtle click haptic feedback
      } else if (latest < 65 && canTrigger) {
        setCanTrigger(false);
      }
    });
    return () => unsubscribe();
  }, [yElastic, canTrigger, isRefreshing]);

  const handleDragEnd = async (_: any, info: any) => {
    if (disabled || isRefreshing) return;

    const currentY = yElastic.get();
    if (currentY >= 65) {
      setIsRefreshing(true);
      haptics.medium();
      
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
    <div className="relative overflow-hidden w-full h-full">
      {/* Visual Refresh Indicator */}
      <motion.div
        style={{
          y: isRefreshing ? 55 : yElastic,
          rotate: isRefreshing ? undefined : rotate,
          opacity: isRefreshing ? 1 : opacity,
        }}
        animate={{ y: isRefreshing ? 55 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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

      {/* Main Drag Container */}
      <motion.div
        drag={disabled || isRefreshing ? false : 'y'}
        onPointerDown={(e) => {
          if (window.scrollY > 0) {
            e.stopPropagation();
          }
        }}
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.45}
        style={{ y }}
        animate={{ y: isRefreshing ? 48 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onDragEnd={handleDragEnd}
        className="w-full h-full min-h-[inherit]"
      >
        {children}
      </motion.div>
    </div>
  );
};
export default PullToRefresh;
