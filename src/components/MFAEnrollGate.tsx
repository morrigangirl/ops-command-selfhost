import { useState } from 'react';
import { MFAEnroll } from '@/components/MFAEnroll';
import { Button } from '@/components/ui/button';
import { Shield, LogOut } from 'lucide-react';

interface MFAEnrollGateProps {
  onEnrolled: () => void;
  onSignOut: () => Promise<void>;
}

export function MFAEnrollGate({ onEnrolled, onSignOut }: MFAEnrollGateProps) {
  const [showEnroll, setShowEnroll] = useState(false);

  if (showEnroll) {
    return (
      <MFAEnroll
        onEnrolled={onEnrolled}
        onCancelled={() => setShowEnroll(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Shield size={24} className="text-primary" />
          <h1 className="font-mono text-lg font-bold tracking-[0.2em] text-primary">OPS COMMAND</h1>
        </div>
        <div className="border border-border rounded-lg p-6 bg-card space-y-4">
          <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground text-center">
            MFA ENROLLMENT REQUIRED
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            Multi-factor authentication is mandatory for all users. You must set up an authenticator app before accessing the system.
          </p>
          <Button
            onClick={() => setShowEnroll(true)}
            className="w-full font-mono tracking-wider"
          >
            SET UP MFA
          </Button>
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full font-mono tracking-wider text-muted-foreground"
          >
            <LogOut size={14} className="mr-2" />
            SIGN OUT
          </Button>
        </div>
      </div>
    </div>
  );
}
