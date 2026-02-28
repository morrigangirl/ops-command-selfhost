import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MFAChallengeProps {
  onVerified: () => void;
}

interface TotpFactor {
  id: string;
  status?: string | null;
}

export function MFAChallenge({ onVerified }: MFAChallengeProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [factorIds, setFactorIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        toast({ title: 'MFA error', description: error.message, variant: 'destructive' });
        return;
      }

      const verifiedTotpFactors = ((data?.totp ?? []) as TotpFactor[])
        .filter((factor) => factor.status === 'verified')
        .map((factor) => factor.id);

      setFactorIds(verifiedTotpFactors);
    })();
  }, [toast]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (factorIds.length === 0 || !code) return;
    setLoading(true);
    try {
      let lastError: Error | null = null;

      for (const factorId of factorIds) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) {
          lastError = challengeError;
          continue;
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code,
        });

        if (!verifyError) {
          onVerified();
          return;
        }

        lastError = verifyError;
      }

      throw lastError ?? new Error('Verification failed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to verify code';
      toast({ title: 'Verification failed', description: message, variant: 'destructive' });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const hasFactor = factorIds.length > 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Shield size={24} className="text-primary" />
          <h1 className="font-mono text-lg font-bold tracking-[0.2em] text-primary">OPS COMMAND</h1>
        </div>
        <form onSubmit={handleVerify} className="border border-border rounded-lg p-6 bg-card space-y-4">
          <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground text-center">
            TWO-FACTOR AUTHENTICATION
          </h2>
          {hasFactor ? (
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app.
            </p>
          ) : (
            <p className="text-xs text-destructive text-center">
              No verified TOTP factor found for this account. Re-enroll MFA from account recovery/admin reset.
            </p>
          )}
          <div>
            <Label className="text-xs font-mono text-muted-foreground">VERIFICATION CODE</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center font-mono text-lg tracking-[0.3em]"
              autoFocus
              maxLength={6}
            />
          </div>
          <Button type="submit" className="w-full font-mono tracking-wider" disabled={!hasFactor || loading || code.length !== 6}>
            {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> VERIFYING...</> : 'VERIFY'}
          </Button>
        </form>
      </div>
    </div>
  );
}
