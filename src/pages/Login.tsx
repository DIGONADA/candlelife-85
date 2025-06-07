
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
        <Card className="border shadow-xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold text-foreground">
              {isSignUp ? "Criar conta" : "Entrar"}
            </CardTitle>
            <p className="text-muted-foreground">
              {isSignUp 
                ? "Crie sua conta para começar" 
                : "Entre em sua conta para continuar"
              }
            </p>
          </CardHeader>
          <CardContent>
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
