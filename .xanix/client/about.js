import { j as jsxRuntimeExports } from './jsx-runtime-BMrLYoZb.js';
import { R as React, r as reactExports } from './index-DgGkw-OG.js';

const Chunk = React.lazy(() => import('./Chunk-SrIfCS_P.js'));
const About = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    "About Page",
    /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading..." }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chunk, {}) })
  ] });
};

export { About as default };
//# sourceMappingURL=about.js.map
