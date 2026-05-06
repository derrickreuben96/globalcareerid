import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { downloadDebugReport } from '@/lib/debugReport';

export function DebugReportButton() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleClick = () => {
    setBusy(true);
    try {
      const report = downloadDebugReport();
      toast({
        title: 'Debug report exported',
        description: `${report.consoleErrors.length} console entries, ${report.networkRequests.length} network requests.`,
      });
    } catch (e) {
      toast({
        title: 'Failed to export debug report',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={busy}
      size="sm"
      variant="outline"
      className="fixed bottom-4 left-4 z-50 gap-2 shadow-lg bg-background/95 backdrop-blur"
      aria-label="Send debug report"
    >
      <Bug className="w-4 h-4" />
      Send debug report
    </Button>
  );
}
