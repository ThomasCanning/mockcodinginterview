'use client';

import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number | null }
>(({ className, value, ...props }, ref) => {
  const safeValue = Math.min(Math.max(value || 0, 0), 100);
  return (
    <div
      ref={ref}
      className={cn('bg-secondary relative h-4 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <div
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (safeValue || 0)}%)` }}
      />
    </div>
  );
});
Progress.displayName = 'Progress';

export { Progress };
