'use client';

import { WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-border">
        <WifiOff className="h-8 w-8 text-primary" />
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        You are offline
      </h1>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Broadcast Manager requires an active internet connection to sync chats, send broadcasts, and access contacts.
      </p>

      <div className="mt-6">
        <Button
          onClick={() => window.location.reload()}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <RotateCcw className="h-4 w-4" />
          Retry Connection
        </Button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground/60">
        Broadcast Manager PWA • Offline Cache
      </p>
    </div>
  );
}
