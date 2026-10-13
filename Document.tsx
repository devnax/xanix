import type { Request } from "express";
import { ThemeProvider, createTheme } from "@xanui/core";

export const metadata = async (
  request: Request,
  context: { id: string; name: string },
) => {
  return {
    title: "My App",
    description: "This is my app",
  };
};

const RootDocument = ({ children }: any) => {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeProvider theme={createTheme({ name: "dark", mode: "dark" })}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootDocument;
