"use client";

import { PartyPopper, Download as DownloadIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function SuccessDialog({
  open,
  onClose,
  filename,
}: {
  open: boolean;
  onClose: () => void;
  filename: string | null;
}) {
  const { canInstall, promptInstall, snoozeInstallPrompt, isSnoozed } = usePwaInstall();

  const showInstallPrompt = canInstall && !isSnoozed();

  const handleMaybeLater = () => {
    snoozeInstallPrompt();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Resume Ready">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <PartyPopper size={26} strokeWidth={1.75} />
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Your Resume is Ready!
        </h2>

        {filename && (
          <p className="flex items-center gap-1.5 text-sm text-foreground-secondary">
            <DownloadIcon size={14} /> {filename}
          </p>
        )}

        <p className="text-sm text-foreground-secondary">
          Thanks for using ResuMint.
        </p>

        {showInstallPrompt && (
          <>
            <p className="mt-2 text-xs text-foreground-secondary">
              Install ResuMint for even quicker access next time.
            </p>
            <div className="mt-3 flex w-full items-center justify-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleMaybeLater}>
                Maybe Later
              </Button>
              <Button size="sm" onClick={() => promptInstall().then(onClose)}>
                Install
              </Button>
            </div>
          </>
        )}

        {!showInstallPrompt && (
          <Button variant="secondary" size="sm" onClick={onClose} className="mt-2">
            Done
          </Button>
        )}
      </div>
    </Dialog>
  );
}
