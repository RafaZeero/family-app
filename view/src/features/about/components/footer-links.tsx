export const AboutFooterLink = () => {
  return (
    <div className="flex items-center justify-end pt-2 border-t">
      <span className="text-[10px] text-muted-foreground">
        @{new Date().getFullYear()} Zeero Tech
      </span>
    </div>
  );
};
