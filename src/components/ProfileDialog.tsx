import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/FormLabel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { Camera, ShieldCheck, ShieldOff } from 'lucide-react';
import { MFAEnroll } from '@/components/MFAEnroll';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || '');
            setAvatarUrl(data.avatar_url);
          }
        });

      supabase.auth.mfa.listFactors().then(({ data }) => {
        const verified = data?.totp?.filter(f => f.status === 'verified');
        setMfaEnabled((verified?.length || 0) > 0);
        setShowEnroll(false);
      });
    }
  }, [open, user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Avatar must be under 2MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
    setUploading(false);
    toast({ title: 'Avatar updated' });
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('user_id', user.id);
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
      onClose();
    }
  };

  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '??';

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">PROFILE</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-mono text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-foreground" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <span className="text-[10px] text-muted-foreground font-mono">
              {uploading ? 'UPLOADING...' : 'CLICK TO CHANGE'}
            </span>
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Your name as shown to others in the app">DISPLAY NAME</FormLabel>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Your login email address (cannot be changed)">EMAIL</FormLabel>
            <Input value={user?.email || ''} disabled className="opacity-50" />
          </div>
          <Button onClick={handleSave} className="w-full font-mono tracking-wider" disabled={loading}>
            {loading ? 'SAVING...' : 'SAVE'}
          </Button>

          <Separator />

          {/* MFA Section */}
          <div>
            <h3 className="font-mono text-[10px] tracking-wider text-muted-foreground mb-3">SECURITY</h3>
            {showEnroll ? (
              <MFAEnroll
                onEnrolled={() => { setMfaEnabled(true); setShowEnroll(false); }}
                onCancelled={() => setShowEnroll(false)}
              />
            ) : mfaEnabled ? (
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  <span className="text-xs font-mono">MFA ENABLED</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Managed by admin support
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldOff size={14} className="text-muted-foreground" />
                  <span className="text-xs font-mono">MFA DISABLED</span>
                </div>
                <Button size="sm" onClick={() => setShowEnroll(true)} className="font-mono text-[10px]">
                  ENABLE MFA
                </Button>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
