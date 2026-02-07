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
  language: string;
  onReset: () => void;
}

export function ViewController({ appConfig, initialCode, language, onReset }: ViewControllerProps) {
  const { isConnected, start, room, end } = useSessionContext();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    if (!isConnected && start && !hasConnected) {
      start();
    }
  }, [isConnected, start, hasConnected]);

  // If we unexpectedly disconnect without having triggered feedback, 
  // we should handle it (e.g. show an error or just go home)
  useEffect(() => {
    if (isConnected) {
      setHasConnected(true);
    } else if (hasConnected && !isGeneratingFeedback && !feedbackData) {
      // Unexpected disconnect
      // For now, if we disconnect and aren't waiting for feedback, just show the feedback view (it will show 'Return Home')
      setShowFeedback(true);
    }
  }, [isConnected, hasConnected, isGeneratingFeedback, feedbackData]);

  const handleHome = () => {
    setShowFeedback(false);
    setFeedbackData(null);
    setHasConnected(false);
    onReset();
  };

  const handleComplete = async (transcript: any[], code: string) => {
    console.log('Interview complete. Generating feedback...');
    setIsGeneratingFeedback(true);
    setShowFeedback(true); // Switch to feedback view immediately to show 'Waiting for feedback'

    try {
      // Disconnect from the room as soon as we have the data we need
      // This stops audio/agent usage while the user waits for the LLM
      if (room) {
        end();
      }

      const response = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          code,
          programming_language: language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate feedback');
      }

      const data = await response.json();
      setFeedbackData(data);
    } catch (error) {
      console.error('Error generating feedback:', error);
      // feedbackData remains null, FeedbackView will show error/retry
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {/* Loading/Connecting view */}
      {!isConnected && !hasConnected && (
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
          onComplete={handleComplete}
        />
      )}

      {/* Feedback view */}
      {showFeedback && (
        <MotionFeedbackView
          key="feedback-view"
          {...VIEW_MOTION_PROPS}
          onHome={handleHome}
          feedbackData={feedbackData}
          isGenerating={isGeneratingFeedback}
        />
      )}
    </AnimatePresence>
  );
}
