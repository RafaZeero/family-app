import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          error: "!border-red-500 !text-white !bg-red-500",
          closeButton: "!border-black !left-auto !right-0 !translate-x-1/2",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
