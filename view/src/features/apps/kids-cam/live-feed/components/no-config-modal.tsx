import { useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NoConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoConfigModal({ open, onOpenChange }: NoConfigModalProps) {
  const navigate = useNavigate();

  const handleConfigure = () => {
    onOpenChange(false);
    navigate({ to: "/kids-cam/settings" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Camera nao configurada</DialogTitle>
          <DialogDescription>
            Defina o IP da camera nas configuracoes antes de conectar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfigure}>
            <Settings className="mr-2 size-4" />
            Quero configurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
