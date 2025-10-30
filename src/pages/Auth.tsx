import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.png';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background-start to-background-end p-4">
      <Card className="w-full max-w-md border-border-subtle shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Tree" className="h-16 w-auto" />
          </div>
          <CardDescription>
            {isForgotPassword 
              ? 'Informe seu email para recuperar sua senha' 
              : isLogin 
                ? 'Entre na sua conta' 
                : 'Crie sua conta e comece a construir sua árvore'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : isForgotPassword ? 'Enviar Link' : isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            {!isForgotPassword && (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="block w-full text-sm text-muted-foreground hover:text-primary transition-smooth"
              >
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
              </button>
            )}
            {isLogin && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(!isForgotPassword)}
                className="block w-full text-sm text-muted-foreground hover:text-primary transition-smooth"
              >
                {isForgotPassword ? 'Voltar ao login' : 'Esqueceu a senha?'}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
