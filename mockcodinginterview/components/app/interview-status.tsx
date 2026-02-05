'use client';

import React from 'react';
import {
    useLocalParticipant,
    useVoiceAssistant,
} from '@livekit/components-react';
import { Track, type LocalAudioTrack } from 'livekit-client';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { AgentDisconnectButton } from '@/components/agents-ui/agent-disconnect-button';
import { cn } from '@/lib/shadcn/utils';

export function InterviewStatus({ className }: { className?: string }) {
    const { state: agentState, audioTrack: agentAudioTrack } = useVoiceAssistant();
    const { localParticipant } = useLocalParticipant();
    const [micTrack, setMicTrack] = React.useState<Track | undefined>(undefined);

    React.useEffect(() => {
        if (localParticipant) {
            const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
            if (pub && pub.isSubscribed && pub.track) {
                setMicTrack(pub.track);
            }
            // Listen for subscription changes if needed, but for local mic it's usually immediate
        }
    }, [localParticipant]);

    // Fallback for mic track if not readily available via publication check
    React.useEffect(() => {
        // Actually useLocalParticipant doesn't give direct track reference easily for visualizer without useTracks or similar.
        // Let's use the track reference properly.
    }, []);


    return (
        <div className={cn("flex flex-col h-full bg-background border-l", className)}>
            <div className="flex-1 flex flex-col items-center justify-center p-8 border-b space-y-4">
                <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">Interviewer</h3>
                <div className="h-32 w-full flex items-center justify-center">
                    <AgentAudioVisualizerBar
                        state={agentState}
                        audioTrack={agentAudioTrack}
                        barCount={7}
                        className="h-24 gap-2"
                    />
                </div>
                <div className="text-sm text-center text-muted-foreground">
                    {agentState === 'thinking' && "Thinking..."}
                    {agentState === 'speaking' && "Speaking..."}
                    {agentState === 'listening' && "Listening..."}
                    {agentState === 'connecting' && "Connecting..."}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
                <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">Candidate (You)</h3>
                <div className="h-32 w-full flex items-center justify-center">
                    <AgentAudioVisualizerBar
                        state="speaking"
                        barCount={7}
                        audioTrack={micTrack as LocalAudioTrack}
                        className="h-24 gap-2 data-[lk-highlighted=true]:bg-blue-500"
                    />
                </div>
            </div>

            <div className="p-6 border-t bg-muted/20">
                <AgentDisconnectButton className="w-full w-full py-6 text-lg font-bold">
                    End Interview
                </AgentDisconnectButton>
            </div>
        </div>
    );
}
