import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil } from 'lucide-react';
import type { PageHelpSections } from '@/help/pageHelp';

interface PageHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeLabel: string;
  loading: boolean;
  content: PageHelpSections;
  sourceLabel?: string;
  onEdit: () => void;
}

interface SectionProps {
  title: string;
  body: string;
}

function Section({ title, body }: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="font-mono text-[11px] tracking-[0.16em] text-primary">{title}</h3>
      <div className="rounded border border-border bg-muted/20 px-3 py-2 text-sm leading-relaxed text-foreground">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 ml-5 list-disc space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal space-y-1">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
          }}
        >
          {body || '- No content yet.'}
        </ReactMarkdown>
      </div>
    </section>
  );
}

export function PageHelpDialog({
  open,
  onOpenChange,
  routeLabel,
  loading,
  content,
  sourceLabel,
  onEdit,
}: PageHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,960px)] max-w-none h-[min(90vh,860px)] p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="font-mono text-sm tracking-[0.14em] text-primary">
            PAGE HELP · {routeLabel.toUpperCase()}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {content.summary}
            {sourceLabel ? ` · Source: ${sourceLabel}` : ''}
          </p>
        </DialogHeader>

        <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            <div className="h-full min-h-48 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading help content...
            </div>
          ) : (
            <>
              <Section title="What This Page Does" body={content.what_this_page_does} />
              <Section title="What Is Expected" body={content.what_is_expected} />
              <Section title="Required Inputs" body={content.required_inputs} />
              <Section title="Primary Actions" body={content.primary_actions} />
              <Section title="Common Mistakes" body={content.common_mistakes} />
              <Section title="Next Steps" body={content.next_steps} />
            </>
          )}
        </div>

        <div className="border-t border-border px-4 py-3 flex items-center justify-end">
          <Button variant="outline" className="gap-2" onClick={onEdit}>
            <Pencil size={14} />
            Edit Help Content
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
