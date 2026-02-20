import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await resetPassword(email);
      if (!error) {
        setIsForgotPassword(false);
      }
    } else if (isLogin) {
      const { error } = await signIn(email, password);
      if (!error) {
        navigate('/dashboard');
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (!error) {
        navigate('/dashboard');
      }
    }

    setLoading(false);
  };

  const getTitle = () => {
    if (isForgotPassword) return 'Recuperar senha';
    return isLogin ? 'Bem-vindo de volta' : 'Crie sua conta';
  };

  const getDescription = () => {
    if (isForgotPassword) return 'Informe seu email para receber o link de recuperação';
    return isLogin ? 'Entre na sua conta para continuar' : 'Comece a construir sua árvore genealógica';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background-start to-background-end p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-sm shadow-elegant border-border/50 relative animate-fade-in">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/10 scale-150 blur-xl" />
              <img src={logo} alt="Tree" className="h-14 w-auto relative" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{getTitle()}</h1>
            <CardDescription className="mt-1 text-sm">{getDescription()}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full h-11 mt-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...</>
              ) : isForgotPassword ? 'Enviar Link' : isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-5 space-y-3">
            {!isForgotPassword && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5 text-center">
              {!isForgotPassword && (
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setIsForgotPassword(false); }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium py-1"
                >
                  {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
                </button>
              )}
              {(isLogin || isForgotPassword) && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(!isForgotPassword)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                >
                  {isForgotPassword ? '← Voltar ao login' : 'Esqueceu a senha?'}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
