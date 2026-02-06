'use client';

import React, { useState } from 'react';
import type { DataPacket_Kind, Participant } from 'livekit-client';
import { useRoomContext, useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { CodeEditor } from '@/components/app/code-editor';
import { cn } from '@/lib/shadcn/utils';
import type { FeedbackData } from './view-controller';

interface SessionViewProps {
  appConfig: AppConfig;
  initialCode?: string;
  onFeedback: (data: FeedbackData) => void;
}

export const SessionView = ({
  appConfig: _appConfig,
  initialCode,
  onFeedback,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  const session = useSessionContext();
  const [chatOpen, setChatOpen] = useState(false);
  const { state: agentState, audioTrack: agentAudioTrack } = useVoiceAssistant();
  const room = useRoomContext();

  React.useEffect(() => {
    if (!room) return;

    const onDataReceived = (
      payload: Uint8Array,
      _participant?: Participant,
      _kind?: DataPacket_Kind,
      _topic?: string
    ) => {
      const str = new TextDecoder().decode(payload);
      try {
        const json = JSON.parse(str);

        if (json.method === 'feedback_generated' && json.payload) {
          const feedback = JSON.parse(json.payload);
          onFeedback(feedback);
        }
      } catch (e) {
        // ignore non-json
      }
    };

    room.on('dataReceived', onDataReceived);
    return () => {
      room.off('dataReceived', onDataReceived);
    };
  }, [room, onFeedback]);

  return (
    <section className="bg-background flex h-svh w-svw flex-col overflow-hidden" {...props}>
      {/* Full Screen Code Editor */}
      <div className="relative w-full flex-1">
        <CodeEditor className="absolute inset-0 h-full w-full" initialCode={initialCode} />
      </div>

      {/* Bottom Bar */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex h-16 shrink-0 items-center justify-between border-t p-4 backdrop-blur">
        {/* Left: Indicators */}
        <div className="flex items-center gap-6">
          {/* Interviewer Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
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
        </div>

        <div className="bg-border h-8 w-px" />

        {/* User Indicator */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
            You
          </span>
          <AgentControlBar
            controls={{
              microphone: true,
              camera: false,
              chat: false,
              screenShare: false,
              leave: false,
            }}
            variant="default"
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={() => session.end()}
            onIsChatOpenChange={setChatOpen}
            className="border-none bg-transparent p-0 shadow-none"
          />
        </div>
      </div>

      {/* Right: End Call */}
      <div className="flex items-center">
        <AgentControlBar
          controls={{
            leave: true,
            microphone: false,
            camera: false,
            chat: false,
            screenShare: false,
          }}
          variant="default"
          isChatOpen={chatOpen}
          isConnected={session.isConnected}
          onDisconnect={() => session.end()}
          onIsChatOpenChange={setChatOpen}
          className="border-none bg-transparent p-0 shadow-none"
        />
      </div>
    </section>
  );
};
