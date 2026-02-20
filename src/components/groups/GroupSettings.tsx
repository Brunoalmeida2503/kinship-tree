import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  allow_member_posts?: boolean;
}

interface GroupSettingsProps {
  group: Group;
  onUpdate: () => void;
}

export function GroupSettings({ group, onUpdate }: GroupSettingsProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [isPrivate, setIsPrivate] = useState(group.is_private);
  const [allowMemberPosts, setAllowMemberPosts] = useState(group.allow_member_posts ?? true);
  const [avatarUrl, setAvatarUrl] = useState(group.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${group.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success('Avatar carregado com sucesso!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao carregar avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('O nome do grupo é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
          allow_member_posts: allowMemberPosts,
          avatar_url: avatarUrl,
        })
        .eq('id', group.id);

      if (error) throw error;

      toast.success('Grupo atualizado com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Erro ao atualizar grupo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Clã</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-2xl">{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Label htmlFor="avatar">Logo do Grupo</Label>
            <label htmlFor="avatar" className="cursor-pointer">
              <div className="mt-2 border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <span className="text-sm">{uploading ? 'Carregando...' : 'Clique para fazer upload'}</span>
              </div>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome do Grupo</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do grupo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do grupo"
            className="min-h-[100px]"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="private">Grupo Privado</Label>
            <p className="text-sm text-muted-foreground">
              {isPrivate 
                ? 'Apenas membros aprovados podem acessar' 
                : 'Qualquer pessoa pode solicitar entrada'}
            </p>
          </div>
          <Switch
            id="private"
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="allow_posts">Permitir Postagens de Membros</Label>
            <p className="text-sm text-muted-foreground">
              {allowMemberPosts 
                ? 'Todos os membros podem criar postagens' 
                : 'Apenas o administrador pode criar postagens'}
            </p>
          </div>
          <Switch
            id="allow_posts"
            checked={allowMemberPosts}
            onCheckedChange={setAllowMemberPosts}
          />
        </div>

        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </CardContent>
    </Card>
  );
}