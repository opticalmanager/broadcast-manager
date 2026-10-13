<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mobile Responsiveness & Native App UX Rules
- **Every time there is any UI change or new feature**, ensure the design is strictly responsive to mobile screens and feels like a native mobile app in mobile view (compact touch cards, accessible touch targets $\ge 44\text{px}$, smooth transitions, zero horizontal overflows, tailored typography, and native-feeling card/sheet layouts) just like previously established in the app.
- Provide both desktop view (tables/grids) and dedicated mobile touch cards (`sm:hidden` vs `hidden sm:block`) whenever presenting lists or reports.

