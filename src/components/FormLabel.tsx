import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { ComponentPropsWithoutRef } from 'react';

interface FormLabelProps extends ComponentPropsWithoutRef<typeof Label> {
  tooltip: string;
}

export function FormLabel({ tooltip, children, className, ...props }: FormLabelProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        <Label className={className} {...props}>{children}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle size={12} className="text-muted-foreground/60 cursor-help shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
