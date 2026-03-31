import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { useCameraStore } from "@/stores/camera-store";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const SettingsPage = () => {
  const { ip, setIp } = useCameraStore();
  const [value, setValue] = useState(ip);
  const navigate = useNavigate();

  useEffect(() => {
    setValue(ip);
  }, [ip]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    await setIp(trimmed);
    toast.success("Configuracoes salvas");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Camera</h2>
          <p className="text-sm text-muted-foreground">
            Endereco IP da camera RTSP
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="camera-ip">IP da camera</Label>
            <Input
              id="camera-ip"
              placeholder="ex: 192.168.0.5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={value.trim() === ip || !value.trim()}>
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
