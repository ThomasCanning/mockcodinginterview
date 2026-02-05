'use client';

import { useMemo, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { SetupScreen } from '@/components/app/setup-screen';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
}


export function App({ appConfig }: AppProps) {
  const [connectionDetails, setConnectionDetails] = useState<{
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
    initialCode?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStart = async (language: string, company: string) => {
    setIsGenerating(true);
    try {
      // If we are in sandbox/demo mode using local env vars for connection, we might skip this.
      // But the requirement implies we want to use the backend to generate questions.
      // So we will always hit the API.

      const res = await fetch('/api/connection-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programming_language: language,
          company_name: company,
          room_config: {
            agents: appConfig.agentName ? [{ agent_name: appConfig.agentName }] : [],
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch connection details: ${res.statusText}`);
      }

      const data = await res.json();
      setConnectionDetails(data);
    } catch (error) {
      console.error('Failed to start interview:', error);
      // Ideally show an error toast here
    } finally {
      setIsGenerating(false);
    }
  };

  if (!connectionDetails) {
    return (
      <>
        <SetupScreen onStart={handleStart} isGenerating={isGenerating} />
        <Toaster
          icons={{
            warning: <WarningIcon weight="bold" />,
          }}
          position="top-center"
          className="toaster group"
        />
      </>
    );
  }

  return (
    <InterviewSession
      appConfig={appConfig}
      connectionDetails={connectionDetails}
    />
  );
}

function InterviewSession({
  appConfig,
  connectionDetails
}: {
  appConfig: AppConfig;
  connectionDetails: {
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
    initialCode?: string;
  }
}) {
  const tokenSource = useMemo(() => {
    return TokenSource.custom(async () => {
      return connectionDetails;
    });
  }, [connectionDetails]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController appConfig={appConfig} initialCode={connectionDetails.initialCode} />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
