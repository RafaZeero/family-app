import { cn } from "@/lib/utils";

interface MainProps extends React.HTMLAttributes<HTMLElement> {
  ref?: React.Ref<HTMLElement>;
}

export const Main = ({ className, ...props }: MainProps) => {
  return (
    <main className={cn("px-4 sm:px-6 lg:px-10 py-6", className)} {...props} />
  );
};

Main.displayName = "Main";
