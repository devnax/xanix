export const metadata = {
  title: "Default Layout",
  description: "This is the default layout for the application",
  keywords: ["default", "layout", "application"],
};

const Layout = ({ children }: any) => {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
};

export default Layout;
