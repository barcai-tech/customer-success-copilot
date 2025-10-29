import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import type { ClerkUser } from "@/app/eval/actions";

interface UserSelectorProps {
  users: ClerkUser[];
  selectedUserId: string;
  loading: boolean;
  onUserChange: (userId: string) => void;
}

export function UserSelector({
  users,
  selectedUserId,
  loading,
  onUserChange,
}: UserSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Test User</label>
      {loading ? (
        <div className="w-full border rounded-lg px-3 py-2 bg-muted text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users...
        </div>
      ) : (
        <Select value={selectedUserId} onValueChange={onUserChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a user..." />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        Choose which user&apos;s customers to test
      </p>
    </div>
  );
}
