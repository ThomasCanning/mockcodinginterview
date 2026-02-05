import { Button } from "@/components/ui/button"

export function FeedbackView({ onHome }: { onHome: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <h1 className="text-2xl font-bold">Interview Complete</h1>
            <p className="text-muted-foreground">Feedback will appear here.</p>
            <Button onClick={onHome}>Return Home</Button>
        </div>
    )
}
