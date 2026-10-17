import { createTheme, ThemeProvider } from "@xanui/core";

export const metadata = () => {
  return {
    title: "Default Layout",
    description: "This is the default layout for the application",
    keywords: ["default", "layout", "application"],
    meta: [{ name: "asd", content: "asd" }],
  };
};

const theme = createTheme({ name: "dark", mode: "dark" });

const Layout = ({ children }: any) => {
  return (
    <html>
      <head></head>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
};

export default Layout;
