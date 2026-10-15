import { createTheme, ThemeProvider } from "@xanui/core";

export const metadata = () => {
  return {
    title: "Default Layout",
    description: "This is the default layout for the application",
    keywords: ["default", "layout", "application"],
    meta: [{ name: "asd", content: "asd" }],
  };
};

const Layout = ({ children }: any) => {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <ThemeProvider theme={createTheme({ name: "dark", mode: "dark" })}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
};

export default Layout;
