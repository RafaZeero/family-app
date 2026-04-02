import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { useCameraStore } from "@/stores/camera-store";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export const SettingsPage = () => {
  const { ip, username, password, setIp, setUsername, setPassword } = useCameraStore();
  const [ipValue, setIpValue] = useState(ip);
  const [usernameValue, setUsernameValue] = useState(username);
  const [passwordValue, setPasswordValue] = useState(password);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIpValue(ip);
    setUsernameValue(username);
    setPasswordValue(password);
  }, [ip, username, password]);

  const handleSave = async () => {
    const trimmedIp = ipValue.trim();
    if (!trimmedIp) return;
    await setIp(trimmedIp);
    await setUsername(usernameValue.trim());
    await setPassword(passwordValue.trim());
    toast.success("Configurações salvas");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const hasChanges =
    ipValue.trim() !== ip ||
    usernameValue.trim() !== username ||
    passwordValue.trim() !== password;

  return (
    <Layout>
      <div className="max-w-lg space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Camera</h2>
          <p className="text-sm text-muted-foreground">
            Endereco IP da câmera RTSP
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="camera-ip">IP da câmera</Label>
            <Input
              id="camera-ip"
              placeholder="ex: 192.168.0.5"
              value={ipValue}
              onChange={(e) => setIpValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera-username">Usuario</Label>
            <Input
              id="camera-username"
              placeholder="ex: admin"
              value={usernameValue}
              onChange={(e) => setUsernameValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera-password">Senha</Label>
            <div className="relative">
              <Input
                id="camera-password"
                type={showPassword ? "text" : "password"}
                placeholder="senha da câmera"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={!hasChanges || !ipValue.trim()}
            >
              Salvar
            </Button>
            {ip && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/kids-cam/live-feed" })}
              >
                Assistir ao feed
              </Button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
};
