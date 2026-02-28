import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'forgot') {
        if (cooldown > 0) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'A password reset link has been sent if the account exists.' });
        startCooldown(60);
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'A confirmation link has been sent to your email.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Shield size={24} className="text-primary" />
          <h1 className="font-mono text-lg font-bold tracking-[0.2em] text-primary">OPS COMMAND</h1>
        </div>
        <form onSubmit={handleSubmit} className="border border-border rounded-lg p-6 bg-card space-y-4">
          <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground text-center">
            {mode === 'login' ? 'SIGN IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'}
          </h2>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">EMAIL</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          {mode !== 'forgot' && (
            <div>
              <Label className="text-xs font-mono text-muted-foreground">PASSWORD</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}
          <Button type="submit" className="w-full font-mono tracking-wider" disabled={loading || (mode === 'forgot' && cooldown > 0)}>
            {loading
              ? 'PROCESSING...'
              : mode === 'forgot'
                ? cooldown > 0 ? `WAIT ${cooldown}s` : 'SEND RESET LINK'
                : mode === 'login' ? 'SIGN IN' : 'SIGN UP'}
          </Button>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            >
              Forgot password?
            </button>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
