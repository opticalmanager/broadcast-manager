'use client';

import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';
import Image from 'next/image';

export function InstallPrompt() {
  const {
    canPrompt,
    isIOS,
    showIOSInstructions,
    setShowIOSInstructions,
    triggerInstall,
    dismissPrompt,
  } = usePwaInstall();

  if (!canPrompt && !showIOSInstructions) {
    return null;
  }

  return (
    <>
      {/* 1. Main Floating Install Banner (Mobile & Desktop) */}
      {canPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 md:bottom-6 md:right-6 md:left-auto md:w-96">
          <div className="relative flex flex-col gap-3 rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-2xl backdrop-blur-md ring-1 ring-border/50">
            <button
              onClick={dismissPrompt}
              aria-label="Dismiss install prompt"
              className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-white shadow-md">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="Broadcast Manager"
                  width={44}
                  height={44}
                  className="rounded-xl"
                />
              </div>
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-sm text-foreground">
                  Install Broadcast Manager
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add to home screen for full-screen view and 1-tap access.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissPrompt}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Not now
              </Button>
              <Button
                size="sm"
                onClick={triggerInstall}
                className="h-8 gap-1.5 bg-primary px-3 text-xs font-medium text-white shadow hover:bg-primary/90"
              >
                {isIOS ? (
                  <>
                    <Smartphone className="h-3.5 w-3.5" />
                    How to install
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Install App
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. iOS Safari Step-by-Step Instructions Modal */}
      {showIOSInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
        >
          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-foreground">
                Install on iPhone or iPad
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Follow these simple steps in Safari to add Broadcast Manager to your home screen:
              </p>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-muted/40 p-4 text-left text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold">
                  1
                </div>
                <div className="flex-1">
                  <span className="font-medium text-foreground">Tap the Share icon</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>In Safari&apos;s bottom toolbar</span>
                    <Share2 className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/40" />

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  2
                </div>
                <div className="flex-1">
                  <span className="font-medium text-foreground">Tap &quot;Add to Home Screen&quot;</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>Scroll down and tap</span>
                    <PlusSquare className="h-3.5 w-3.5 text-foreground" />
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full bg-primary hover:bg-primary/90"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
