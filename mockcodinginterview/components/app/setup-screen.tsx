import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const TECH_COMPANIES = [
    // --- The "Big Tech" Giants ---
    "Meta",
    "Google",
    "Amazon",
    "Apple",
    "Microsoft",
    "Netflix",

    // --- Modern Data & Infrastructure (System Heavy) ---
    "Confluent",
    "Databricks",
    "Snowflake",
    "HashiCorp",
    "Cloudflare",
    "MongoDB",
    "Elastic",

    // --- High Growth Product Unicorns ---
    "Airbnb",
    "Uber",
    "Stripe",
    "Lyft",
    "DoorDash",
    "Pinterest",
    "Snap",
    "LinkedIn",
    "ByteDance (TikTok)",
    "Palantir",
    "Slack",
    "Spotify",
    "Shopify",
    "Twilio",
    "Zoom",
    "Okta",

    // --- Quant / High Finance (Math/C++) ---
    "Jane Street",
    "Citadel",
    "Two Sigma",
    "Hudson River Trading (HRT)",
    "Jump Trading",
    "D. E. Shaw",
    "Goldman Sachs",
    "Bloomberg",

    // --- Hardware & Chips ---
    "Nvidia",
    "Tesla",
    "SpaceX",
    "Intel",
    "AMD",

    // --- Enterprise/Standard ---
    "Salesforce",
    "Adobe",
    "Oracle",
    "Cisco",
    "Samsung",
    "Walmart Global Tech",
    "Capital One"
];

const PROGRAMMING_LANGUAGES = [
    // The Powerhouses
    "Python",
    "Java",
    "C++",
    "JavaScript",
    "TypeScript",

    // The Modern Systems & Backend
    "Go (Golang)",
    "Rust",       // Great for Confluent/Snowflake targets
    "C#",

    // Mobile & Legacy
    "Kotlin",     // The modern standard for Android/Java devs
    "Swift",      // If you have Kotlin, you usually add Swift (iOS)
    "C",          // Hard mode (Embedded/Kernel roles)
    "Dart"        // Flutter devs
];

interface SetupScreenProps {
    onStart: (language: string, company: string) => void;
    isGenerating: boolean;
}

export function SetupScreen({ onStart, isGenerating }: SetupScreenProps) {
    const [language, setLanguage] = useState<string>("Python");
    const [company, setCompany] = useState<string>("");

    const handleStart = () => {
        onStart(language, company);
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Interview Setup</h1>
                    <p className="mt-2 text-muted-foreground">
                        Configure your mock interview session
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Programming Language
                        </label>
                        <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                            <SelectContent>
                                {PROGRAMMING_LANGUAGES.map((lang) => (
                                    <SelectItem key={lang} value={lang}>
                                        {lang}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Target Company <span className="text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <Select value={company} onValueChange={setCompany} disabled={isGenerating}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a company (Optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value=" ">None (Generic)</SelectItem>
                                {TECH_COMPANIES.map((comp) => (
                                    <SelectItem key={comp} value={comp}>
                                        {comp}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleStart}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting up interview...
                            </>
                        ) : (
                            "Start Interview"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
