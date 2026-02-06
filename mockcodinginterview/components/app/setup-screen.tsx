import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/shadcn/utils';

const TECH_COMPANIES = [
  'Amazon',
  'Apple',
  'Google',
  'Meta',
  'Microsoft',
  'Netflix',
  'Palantir',
  'Uber',
];

const PROGRAMMING_LANGUAGES = ['Python', 'Java', 'C++', 'JavaScript', 'TypeScript', 'Go'];

interface SetupScreenProps {
  onStart: (language: string, company: string) => void;
  isGenerating: boolean;
}

export function SetupScreen({ onStart, isGenerating }: SetupScreenProps) {
  const [language, setLanguage] = useState<string>('Python');
  const [company, setCompany] = useState<string>('');
  const [openCompany, setOpenCompany] = useState(false);

  const handleStart = () => {
    onStart(language, company);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Interview Setup</h1>
          <p className="text-muted-foreground text-sm">Configure your mock interview session</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-foreground/70 text-sm leading-none font-medium">
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

          <div className="flex flex-col space-y-2">
            <label className="text-foreground/70 text-sm leading-none font-medium">
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
                  {company ? company : 'Select a company'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search company..." onValueChange={() => {}} />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty className="text-muted-foreground px-4 py-2 text-sm">
                      <div className="rounded-sm px-2 py-1.5">No company found.</div>
                    </CommandEmpty>
                    <CommandGroup>
                      {TECH_COMPANIES.map((comp) => (
                        <CommandItem
                          key={comp}
                          value={comp}
                          onSelect={(currentValue) => {
                            setCompany(currentValue === company ? '' : currentValue);
                            setOpenCompany(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              company === comp ? 'opacity-100' : 'opacity-0'
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

          <Button className="mt-6 w-full" size="lg" onClick={handleStart} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Start Interview'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
