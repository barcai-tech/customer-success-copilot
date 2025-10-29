import { Button } from "@/src/components/ui/button";
import type { QuickActionType } from "@/src/contracts/eval";

const ACTIONS: QuickActionType[] = [
  "health",
  "renewal",
  "qbr",
  "email",
  "churn",
];

interface ActionSelectorProps {
  selectedActions: QuickActionType[];
  onActionToggle: (action: QuickActionType) => void;
}

export function ActionSelector({
  selectedActions,
  onActionToggle,
}: ActionSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">Actions</label>
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action}
            variant={selectedActions.includes(action) ? "default" : "outline"}
            size="sm"
            onClick={() => onActionToggle(action)}
            className="capitalize"
          >
            {action}
          </Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Selected: {selectedActions.length}
      </div>
    </div>
  );
}
