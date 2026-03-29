import { Main } from "@/components/layout/main";
import { Header } from "@/components/layout/header";

type LayoutProps = {
  children?: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Header />
      <Main>{children}</Main>
    </>
  );
};
