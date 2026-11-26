/** Inline CSS imports (vite `?inline` query). */
declare module '*.css?inline' {
  const css: string;
  export default css;
}
