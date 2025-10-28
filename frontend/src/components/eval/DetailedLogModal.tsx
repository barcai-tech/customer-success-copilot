"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { useDetailLogStore } from "@/src/store/eval-detail-store";
import { DetailedResultLogView } from "./DetailedResultLogView";

interface DetailedLogModalProps {
  resultId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DetailedLogModal({
  resultId,
  isOpen,
  onClose,
}: DetailedLogModalProps) {
  const getResultLog = useDetailLogStore((state) => state.getResultLog);

  const log = resultId ? getResultLog(resultId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Execution Timeline</DialogTitle>
        </DialogHeader>

        {log ? (
          <DetailedResultLogView log={log} />
        ) : (
          <div className="text-sm text-muted-foreground">
            No execution data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
