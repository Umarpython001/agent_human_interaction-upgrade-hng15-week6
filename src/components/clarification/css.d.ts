// Ambient declaration for CSS imports (component-scoped stylesheets).
// Temporary until LEAD lands `src/vite-env.d.ts` with vite/client types —
// without one of these, `tsc` cannot resolve `import "./x.css"`.
declare module "*.css";
