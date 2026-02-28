import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/');
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
          <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground text-center">SET NEW PASSWORD</h2>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">NEW PASSWORD</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">CONFIRM PASSWORD</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full font-mono tracking-wider" disabled={loading}>
            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </Button>
        </form>
      </div>
    </div>
  );
}
