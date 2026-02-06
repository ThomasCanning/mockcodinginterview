'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
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

export interface FeedbackData {
  technical_score: number;
  technical_feedback: string;
  communication_score: number;
  communication_feedback: string;
  problem_solving_score: number;
  problem_solving_feedback: string;
  overall_summary: string;
  strengths: string[];
  improvements: string[];
}

interface ViewControllerProps {
  appConfig: AppConfig;
  initialCode?: string;
  onReset: () => void;
}

export function ViewController({ appConfig, initialCode, onReset }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    if (!isConnected && start && !hasConnected) {
      start();
    }
  }, [isConnected, start, hasConnected]);

  useEffect(() => {
    if (isConnected) {
      setHasConnected(true);
    } else if (hasConnected) {
      // If we disconnect and have feedback data, show it.
      // If we disconnect without feedback data, it might be an error or early exit, 
      // but showing feedback needs data.
      // If we rely on RPC to set feedback, we should probably switch to feedback view 
      // primarily when feedback arrives, or when disconnected IF we have feedback.
      if (feedbackData) {
        setShowFeedback(true);
      } else {
        // Fallback or just show feedback view saying "No feedback" if expected?
        // For now let's only show if we have data, otherwise maybe Go Home?
        // Or we can just show the empty feedback view (original behavior).
        setShowFeedback(true);
      }
    }
  }, [isConnected, hasConnected, feedbackData]);

  const handleHome = () => {
    setShowFeedback(false);
    setFeedbackData(null);
    setHasConnected(false);
    onReset();
  };

  const handleFeedback = (data: FeedbackData) => {
    console.log("Feedback received:", data);
    setFeedbackData(data);
    // Optionally trigger disconnect here if the agent doesn't do it?
    // The agent usually disconnects after sending feedback.
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
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4 font-medium">Connecting to interview...</p>
        </motion.div>
      )}

      {/* Session view */}
      {isConnected && !showFeedback && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          appConfig={appConfig}
          initialCode={initialCode}
          onFeedback={handleFeedback}
        />
      )}

      {/* Feedback view */}
      {showFeedback && (
        <MotionFeedbackView
          key="feedback-view"
          {...VIEW_MOTION_PROPS}
          onHome={handleHome}
          feedbackData={feedbackData}
        />
      )}
    </AnimatePresence>
  );
}
