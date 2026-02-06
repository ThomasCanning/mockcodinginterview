import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { z } from 'zod';
import { RoomConfiguration } from '@livekit/protocol';
import { Agent } from '@mastra/core/agent';
import { generateInterview } from '@/mastra';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  initialCode?: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Parse configuration from request body
    const body = await req.json();
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name || 'interviewer-agent';

    // Extract user preferences with fallbacks
    const programming_language = body?.programming_language || 'python';
    const company_name = body?.company_name || 'Generic Tech Company';

    // Generate participant token
    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    // --- EXECUTE MASTRA PIPELINE ---
    // --- EXECUTE MASTRA PIPELINE ---
    const { interviewer_problem_reference_guide, text_based_problem_description_given_to_user } =
      await generateInterview(company_name, programming_language);

    if (!text_based_problem_description_given_to_user) {
      throw new Error('Failed to generate interview content');
    }

    // Pack into metadata for the LiveKit agent to read
    const metadata = JSON.stringify({
      programming_language,
      text_based_problem_description_given_to_user,
      interviewer_problem_reference_guide,
    });

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName, metadata },
      roomName,
      agentName
    );

    // Return connection details to the Frontend
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
      initialCode: text_based_problem_description_given_to_user, // This is what goes into the Monaco Editor
    };

    const headers = new Headers({
      'Cache-Control': 'no-store',
    });

    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Unknown error', { status: 500 });
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (agentName) {
    at.roomConfig = new RoomConfiguration({
      agents: [{ agentName, metadata: userInfo.metadata }],
    });
  }

  return at.toJwt();
}
