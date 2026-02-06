import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { FeedbackData } from './view-controller';

export function FeedbackView({
  onHome,
  feedbackData,
}: {
  onHome: () => void;
  feedbackData: FeedbackData | null;
}) {
  if (!feedbackData) {
    return (
      <div className="bg-background flex h-svh flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold">Interview Complete</h1>
        <p className="text-muted-foreground">Waiting for feedback...</p>
        <Button onClick={onHome} variant="outline">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-svh w-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">Interview Feedback</h1>
          <p className="text-muted-foreground text-sm">AI Evaluation Results</p>
        </div>
        <Button onClick={onHome}>Return Home</Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Overall Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {feedbackData.overall_summary}
              </p>
            </CardContent>
          </Card>

          {/* Scores */}
          <div className="grid gap-6 md:grid-cols-3">
            <ScoreCard
              label="Technical"
              score={feedbackData.technical_score}
              feedback={feedbackData.technical_feedback}
            />
            <ScoreCard
              label="Communication"
              score={feedbackData.communication_score}
              feedback={feedbackData.communication_feedback}
            />
            <ScoreCard
              label="Problem Solving"
              score={feedbackData.problem_solving_score}
              feedback={feedbackData.problem_solving_feedback}
            />
          </div>

          {/* Strengths & Improvements */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedbackData.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <XCircle className="h-5 w-5" /> Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedbackData.improvements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, feedback }: { label: string; score: number; feedback: string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between text-base">
          {label}
          <span className="font-mono text-lg font-bold">{score}/10</span>
        </CardTitle>
        <Progress value={score * 10} className="h-2" />
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-muted-foreground text-sm">{feedback}</p>
      </CardContent>
    </Card>
  );
}
