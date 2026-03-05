import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';

interface MFAEnrollProps {
  onEnrolled: () => void;
  onCancelled: () => void;
}

export function MFAEnroll({ onEnrolled, onCancelled }: MFAEnrollProps) {
  const [factorId, setFactorId] = useState('');
  const [qr, setQR] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      // Clean up any abandoned/unverified factors using getUser() which returns ALL factors
      const { data: userData } = await supabase.auth.getUser();
      const allFactors = userData?.user?.factors ?? [];
      for (const f of allFactors) {
        if (f.factor_type === 'totp' && (f.status as string) !== 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App', issuer: 'OpsCommand' });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      setFactorId(data.id);
      setQR(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !code) return;
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      toast({ title: 'MFA enabled', description: 'Two-factor authentication is now active.' });
      onEnrolled();
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={16} className="text-primary" />
        <h3 className="font-mono text-xs tracking-wider">ENABLE TWO-FACTOR AUTH</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
      </p>
      {qr ? (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-lg">
            <img src={qr} alt="MFA QR Code" className="w-48 h-48" />
          </div>
          <details className="text-[10px] text-muted-foreground">
            <summary className="cursor-pointer font-mono">CAN'T SCAN? ENTER CODE MANUALLY</summary>
            <code className="block mt-2 bg-muted p-2 rounded text-[11px] break-all select-all">{secret}</code>
          </details>
        </div>
      ) : (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
      )}
      <form onSubmit={handleVerify} className="space-y-3">
        <div>
          <Label className="text-xs font-mono text-muted-foreground">VERIFICATION CODE</Label>
          <Input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="text-center font-mono text-lg tracking-[0.3em]"
            maxLength={6}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancelled} className="flex-1 font-mono text-xs">
            CANCEL
          </Button>
          <Button type="submit" className="flex-1 font-mono text-xs" disabled={loading || code.length !== 6}>
            {loading ? 'VERIFYING...' : 'ACTIVATE'}
          </Button>
        </div>
      </form>
    </div>
  );
}
