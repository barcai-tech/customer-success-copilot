"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { useDetailLogStore } from "@/src/store/eval-detail-store";
import { getExecutionSteps } from "@/src/db/eval-actions";
import { DetailedResultLogView } from "./DetailedResultLogView";
import type { ExecutionStep } from "@/src/store/eval-detail-store";
import { logger } from "@/src/lib/logger";

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
  const [dbSteps, setDbSteps] = useState<ExecutionStep[] | null>(null);

  // Try to get log from Zustand store first, then fallback to database
  const storeLog = resultId ? getResultLog(resultId) : null;

  // Fetch from database if store log is empty
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!resultId) {
      return;
    }

    if (storeLog?.steps?.length) {
      logger.debug(
        "[DetailedLogModal] Using store log with",
        storeLog.steps.length,
        "steps"
      );
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        logger.debug(
          "[DetailedLogModal] Fetching execution steps for result:",
          resultId
        );
        const dbRows = await getExecutionSteps(resultId);
        logger.debug("[DetailedLogModal] Got db rows:", dbRows?.length);
        if (isMounted) {
          if (!dbRows || dbRows.length === 0) {
            logger.debug("[DetailedLogModal] No steps found in database");
            setDbSteps([]);
            return;
          }
          // Convert database rows to ExecutionSteps
          const convertedSteps: ExecutionStep[] = dbRows.map((row) => ({
            id: row.id.toString(),
            timestamp: row.createdAt,
            level: row.level as
              | "info"
              | "success"
              | "error"
              | "warning"
              | "debug",
            title: row.title,
            description: row.description || undefined,
            durationMs: row.durationMs || undefined,
          }));
          logger.debug(
            "[DetailedLogModal] Converted",
            convertedSteps.length,
            "steps"
          );
          setDbSteps(convertedSteps);
        }
      } catch (error) {
        logger.error(
          "[DetailedLogModal] Failed to fetch execution steps:",
          error
        );
        if (isMounted) {
          setDbSteps([]);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, resultId, storeLog?.steps?.length]);

  // Construct log from either source
  const log =
    storeLog ||
    (dbSteps
      ? {
          resultId: resultId || "",
          customerName: "",
          action: "",
          steps: dbSteps,
          totalDurationMs:
            dbSteps.reduce((sum, step) => sum + (step.durationMs || 0), 0) || 0,
          startTime: new Date(),
          endTime: new Date(),
        }
      : null);

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
