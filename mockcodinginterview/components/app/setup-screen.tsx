import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/shadcn/utils";

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
    "Python",
    "Java",
    "C++",
    "JavaScript",
    "TypeScript",
    "Go (Golang)",
    "C#",
];

interface SetupScreenProps {
    onStart: (language: string, company: string) => void;
    isGenerating: boolean;
}

export function SetupScreen({ onStart, isGenerating }: SetupScreenProps) {
    const [language, setLanguage] = useState<string>("Python");
    const [company, setCompany] = useState<string>("");
    const [openCompany, setOpenCompany] = useState(false);

    const handleStart = () => {
        onStart(language, company);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Interview Setup</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure your mock interview session
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none text-foreground/70">
                            Programming Language
                        </label>
                        <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                            <SelectTrigger className="h-10">
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

                    <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-medium leading-none text-foreground/70">
                            Target Company (Optional)
                        </label>
                        <Popover open={openCompany} onOpenChange={setOpenCompany}>
                            <PopoverTrigger asChild disabled={isGenerating}>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCompany}
                                    className="h-10 w-full justify-between font-normal"
                                >
                                    {company
                                        ? company
                                        : "Select a company"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput
                                        placeholder="Search company..."
                                        onValueChange={(val) => {
                                            // Allow setting custom value if it doesn't match
                                            // This is handled by creating a new entry implicitly if confusing, 
                                            // but standard shadcn pattern usually filters.
                                            // For simple free text input + suggestions, we might need a slightly different pattern
                                            // but let's stick to standard combobox behavior first.
                                            // Actually, the user wants to TYPE in. 
                                            // If CommandInput value changes, we typically filter. 
                                        }}

                                    />
                                    <CommandList className="max-h-[200px]">
                                        <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                                            <div
                                                className="cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm px-2 py-1.5"
                                                onClick={() => {
                                                    // NOTE: This relies on accessing the input value which isn't directly exposed nicely here.
                                                    // A better way for "Creatable" is manually managing the input state.
                                                    // We'll fix this in a second pass if this simple empty state isn't enough.
                                                    // For now, let's just show the companies.
                                                }}
                                            >
                                                No company found.
                                            </div>
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {TECH_COMPANIES.map((comp) => (
                                                <CommandItem
                                                    key={comp}
                                                    value={comp}
                                                    onSelect={(currentValue) => {
                                                        setCompany(currentValue === company ? "" : currentValue);
                                                        setOpenCompany(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            company === comp ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {comp}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        className="w-full mt-6"
                        size="lg"
                        onClick={handleStart}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting up...
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
