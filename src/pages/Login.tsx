
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import SignUpForm from "@/components/auth/SignUpForm";

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const toggleView = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-secondary/20 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border shadow-2xl bg-card/95 backdrop-blur-sm mx-auto">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {isSignUp ? "Criar conta" : "Entrar"}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {isSignUp 
                ? "Crie sua conta para começar a jornada" 
                : "Entre em sua conta para continuar"
              }
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {isSignUp ? (
              <SignUpForm toggleView={toggleView} />
            ) : (
              <LoginForm toggleView={toggleView} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
