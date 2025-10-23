"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

export default function DebugPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [status, setStatus] = useState<string>("");

  const handleSeed = async () => {
    try {
      if (!user?.id) {
        setStatus("No userId available");
        return;
      }
      setStatus("Seeding...");
      const res = await fetch(`/api/db/seed-user?owner=${encodeURIComponent(user.id)}`, { method: "POST" });
      const json = await res.json();
      setStatus(JSON.stringify(json));
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Debug</h1>
      <div className="text-sm">
        <div>isLoaded: {String(isLoaded)}</div>
        <div>isSignedIn: {String(isSignedIn)}</div>
        <div>userId: {user?.id || "null"}</div>
        <div>email: {user?.primaryEmailAddress?.emailAddress || ""}</div>
      </div>
      <button onClick={handleSeed} className="px-3 py-2 rounded bg-primary text-primary-foreground border">
        Seed demo data for this user
      </button>
      {status && (
        <pre className="text-xs p-3 rounded border bg-muted whitespace-pre-wrap break-words">{status}</pre>
      )}
    </div>
  );
}

