import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';
import { Agent } from "@mastra/core/agent";
import { z } from "zod";

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  initialCode?: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

import { generateInterview } from '@/mastra';

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
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name || "interviewer-agent";

    // Extract user preferences with fallbacks
    const programming_language = body?.programming_language || 'python';
    const company_name = body?.company_name || 'Generic Tech Company';

    // Generate participant token
    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    // --- EXECUTE MASTRA PIPELINE ---
    const { guide, candidate_prompt, starter_code } = await generateInterview(company_name, programming_language);

    if (!candidate_prompt || !starter_code) {
      throw new Error("Failed to generate interview content");
    }

    // Format the guide object into a string for the Python agent
    const formattedGuide = `
# ${guide.title}

## Context
${guide.company_context}

## Solution Walkthrough
${guide.solution_walkthrough}

## Common Pitfalls
${guide.common_pitfalls.map(p => `- ${p}`).join('\n')}

## Evaluation Rubric
${guide.evaluation_rubric}
    `.trim();

    // Pack into metadata for the LiveKit agent to read
    // We map 'candidate_prompt' to 'text_based_problem_description_given_to_user' to maintain naming compatibility
    const metadata = JSON.stringify({
      programming_language,
      text_based_problem_description_given_to_user: candidate_prompt,
      interviewer_problem_reference_guide: formattedGuide,
      starter_code: starter_code // Passed potentially for future agent features
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
      initialCode: starter_code, // This is what goes into the Monaco Editor
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
    return new NextResponse("Unknown error", { status: 500 });
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