'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { AppConfig } from '@/app-config';
import { FeedbackView } from '@/components/app/feedback-view';
import { SessionView } from '@/components/app/session-view';
const MotionSessionView = motion.create(SessionView);
const MotionFeedbackView = motion.create(FeedbackView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
  initialCode?: string;
}

export function ViewController({ appConfig, initialCode }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    if (!isConnected && start) {
      start();
    }
  }, [isConnected, start]);

  useEffect(() => {
    if (isConnected) {
      setHasConnected(true);
    } else if (hasConnected) {
      setShowFeedback(true);
    }
  }, [isConnected, hasConnected]);

  const handleHome = () => {
    setShowFeedback(false);
    setHasConnected(false);
  };

  return (
    <AnimatePresence mode="wait">
      {/* Loading/Connecting view */}
      {!isConnected && !showFeedback && (
        <motion.div
          key="connecting"
          {...VIEW_MOTION_PROPS}
          className="flex flex-col items-center justify-center p-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground font-medium">Connecting to interview...</p>
        </motion.div>
      )}

      {/* Session view */}
      {isConnected && (
        <MotionSessionView key="session-view" {...VIEW_MOTION_PROPS} appConfig={appConfig} initialCode={initialCode} />
      )}

      {/* Feedback view */}
      {showFeedback && (
        <MotionFeedbackView key="feedback-view" {...VIEW_MOTION_PROPS} onHome={handleHome} />
      )}
    </AnimatePresence>
  );
}
