import { NextResponse } from 'next/server';
import { generateFeedback } from '@/mastra';

export const maxDuration = 60; // Allow 60 seconds for the agent to run

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { transcript, code, programming_language } = body;

        if (!transcript || !code || !programming_language) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const feedback = await generateFeedback(transcript, code, programming_language);

        return NextResponse.json(feedback);
    } catch (error) {
        console.error('Error generating feedback:', error);
        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 500 });
        }
        return new NextResponse('Unknown error', { status: 500 });
    }
}
