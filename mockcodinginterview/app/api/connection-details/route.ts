import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
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

    // Parse agent configuration from request body
    const body = await req.json();
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name;

    // Generate participant token
    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    const programming_language = 'python';

    // Note: In a real application, you might use a template engine or formatted string to ensure indentation is correct for Python
    const text_based_problem_description_given_to_user = `
# Two Sum  Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.  
# You may assume that each input would have **exactly one solution**, and you may not use the same element twice.  
# You can return the answer in any order.  
#
# Example 1: **Input:** nums = [2,7,11,15], target = 9 **Output:** [0,1] **Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].  
# Example 2: **Input:** nums = [3,2,4], target = 6 **Output:** [1,2]  
#
# Constraints: 
# * \`2 <= nums.length <= 10^4\` 
# * \`-10^9 <= nums[i] <= 10^9\` 
# * \`-10^9 <= target <= 10^9\` 
# * **Only one valid answer exists.**
`;

    const interviewer_problem_reference_guide = `
### PROBLEM SUMMARY The candidate needs to find two indices in an array that sum to a specific target.  ### APPROACH 1: Brute Force (Naive) - **Logic:** Use a nested loop. For each element \`i\`, iterate through the rest of the array \`j\` to see if \`nums[i] + nums[j] == target\`. - **Time Complexity:** O(n^2) - Very slow for large inputs. - **Space Complexity:** O(1). - **Feedback:** If the user does this, accept it but ask: "This works, but it's O(n^2). Can you think of a way to do this in linear time, perhaps using more memory?"  ### APPROACH 2: Hash Map (Optimized) - **Logic:** Iterate through the array once. For each element \`x\`, calculate the \`complement = target - x\`. Check if \`complement\` exists in the hash map. If yes, return the current index and the complement's index. If no, store \`x\` mapped to its index. - **Time Complexity:** O(n). - **Space Complexity:** O(n). - **Feedback:** This is the ideal solution.  ### COMMON PITFALLS & HINTS 1. **Using the same element:** The user might mistakenly use \`nums[i]\` twice (e.g., if target is 6 and \`nums[i]\` is 3).     - *Hint:* "Remember, you cannot use the same element twice." 2. **Returning Values vs Indices:** Users often return \`[2, 7]\` instead of \`[0, 1]\`.    - *Hint:* "Check the return type required by the problem description." 3. **Off-by-one errors:** In the brute force approach, the inner loop should start at \`i + 1\`.  ### EDGE CASES - The array length is minimum 2 (guaranteed by constraints). - Negative numbers are allowed (logic remains the same).`;

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

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
      // @ts-expect-error adding extra field
      initialCode: text_based_problem_description_given_to_user,
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
      agents: [{ agentName }],
    });
  }

  return at.toJwt();
}
