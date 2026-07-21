# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# base-ui, not Radix

shadcn/ui in this project is built on `@base-ui/react`, not Radix. There is no `asChild` prop — use the `render` prop instead: `<Trigger render={<Button />}>children</Trigger>`. Non-`<button>` elements passed via `render` need `nativeButton={false}`. `*Label` components under a menu need a `*Group` ancestor.
