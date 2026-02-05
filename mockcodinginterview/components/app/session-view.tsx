'use client';

import React, { useState } from 'react';
import { useSessionContext, useSessionMessages, useVoiceAssistant } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import {
  AgentControlBar,
} from '@/components/agents-ui/agent-control-bar';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { CodeEditor } from '@/components/app/code-editor';
import { cn } from '@/lib/shadcn/utils';

interface SessionViewProps {
  appConfig: AppConfig;
  initialCode?: string;
}

export const SessionView = ({
  appConfig,
  initialCode,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  const session = useSessionContext();
  const [chatOpen, setChatOpen] = useState(false);
  const {
    state: agentState,
    audioTrack: agentAudioTrack,
  } = useVoiceAssistant();

  return (
    <section className="flex h-svh w-svw flex-col overflow-hidden bg-background" {...props}>
      {/* Full Screen Code Editor */}
      <div className="flex-1 relative w-full">
        <CodeEditor className="absolute inset-0 h-full w-full" initialCode={initialCode} />
      </div>

      {/* Bottom Bar */}
      <div className="flex shrink-0 items-center justify-between border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 h-16">
        {/* Left: Indicators */}
        <div className="flex items-center gap-6">
          {/* Interviewer Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Interviewer
            </span>
            <AgentAudioVisualizerBar
              barCount={5}
              state={agentState}
              audioTrack={agentAudioTrack}
              className="h-6 w-20 gap-1"
            >
              <span
                className={cn([
                  'bg-muted min-h-1.5 w-1.5 rounded-full',
                  'origin-center transition-all duration-200 ease-in-out',
                  'data-[lk-highlighted=true]:bg-primary',
                  'data-[lk-highlighted=true]:h-full',
                ])}
              />
            </AgentAudioVisualizerBar>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* User Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              You
            </span>
            <AgentControlBar
              controls={{ microphone: true, camera: false, chat: false, screenShare: false, leave: false }}
              variant="default"
              isChatOpen={chatOpen}
              isConnected={session.isConnected}
              onDisconnect={() => session.end()}
              onIsChatOpenChange={setChatOpen}
              className="p-0 border-none shadow-none bg-transparent"
            />
          </div>
        </div>

        {/* Right: End Call */}
        <div className="flex items-center">
          <AgentControlBar
            controls={{ leave: true, microphone: false, camera: false, chat: false, screenShare: false }}
            variant="default"
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={() => session.end()}
            onIsChatOpenChange={setChatOpen}
            className="p-0 border-none shadow-none bg-transparent"
          />
        </div>
      </div>
    </section>
  );
};
