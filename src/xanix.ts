import { renderToString } from "react-dom/server";
import type { Request, Response } from "express";
import { isValidElement } from "react";

const xanix = () => {
  return async (_req: Request, res: Response, next: any) => {
    const originalSend = res.send.bind(res);
    (res as any).send = async (component: any) => {
      if (typeof component !== "object" || !isValidElement(component)) {
        originalSend(component);
        return;
      }

      // const { title, description } = component.type.metadata || {};
      if (_req.query.static) {
        res.setHeader("Content-Type", "application/json");
        originalSend(
          JSON.stringify({
            source: "script.js",
            props: component.props,
          }),
        );
      } else {
        const html = renderToString(component);

        res.setHeader("Content-Type", "text/html");
        originalSend(
          `
        <!doctype html>
        <html>
          <head>
          </head>
          <body>
            <div>${html}</div>
            <script>
              window.__INITIAL_PROPS__ = ${JSON.stringify(component.props)};
            </script>
          </body>
        </html>
      `,
        );
      }
    };
    next();
  };
};

export default xanix;
