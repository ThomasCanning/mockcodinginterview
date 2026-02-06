'use client';

import React, { useState } from 'react';
import {
  useSessionContext,
  useSessionMessages,
  useVoiceAssistant,
} from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { CodeEditor } from '@/components/app/code-editor';
import { cn } from '@/lib/shadcn/utils';

import { useRoomContext } from '@livekit/components-react';

interface SessionViewProps {
  appConfig: AppConfig;
  initialCode?: string;
  onFeedback: (data: any) => void;
}

export const SessionView = ({
  appConfig,
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

    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
      // RPCs might come as data packets if not using standard RPC mechanism? 
      // Standard RPCs in LiveKit JS SDK are handled via `room.on('method', ...)` ?
      // Actually, LiveKit JS SDK `performRpc` sends data. Receiving RPC is often done by handling data messages 
      // OR simply defining a method on the local participant if we were in the other direction.
      // However, the Python agent code uses `room.local_participant.perform_rpc`. 
      // In JS, we handle this by `room.on(RoomEvent.DataReceived, ...)`.
      // Wait, `perform_rpc` is a specific protocol on top of Data messages.
      // LiveKit Agents `perform_rpc` wraps the data in a specific structure.
      // Let's verify how `perform_rpc` is handled on the JS side.
      // Usually it's just a structured data packet.
    };

    // Actually, looking at the Python agent, it calls `perform_rpc`.
    // The LiveKit JS SDK doesn't have a built-in high-level "onRpc" handler exposed as easily as the Py SDK right now (unless changed recently).
    // BUT! We can use `useRemoteParticipants` and register an RPC handler if we were using the new RPC hooks?
    // Oh, the standard way now is mostly checking `DataReceived`.
    // Let's look at `use-perform-rpc` or similar hooks if I have them or just standard event listener.
    // The Python agent sends a method "feedback_generated" with a payload.
    // I will use `room.on('dataReceived')` and parse it.
    // If it's a standard RPC, the topic might be specific or the payload has a structure.

    const onDataReceived = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
      const str = new TextDecoder().decode(payload);
      try {
        const json = JSON.parse(str);
        // Check if this looks like our feedback payload or an RPC wrapper
        // If the Python agent calls `perform_rpc`, it sends a specific format.
        // If I can't easily parse the internal RPC format, I might just have the Python agent `publish_data` instead.
        // `perform_rpc` expects a response.
        // For simplicity, let's assume I might change Python agent to `publish_data` if `perform_rpc` is hard to catch here.
        // BUT, let's try to catch it.
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
