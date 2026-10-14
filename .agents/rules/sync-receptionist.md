# AI Receptionist Synchronization Rule

Whenever you make any modifications, additions, or bug fixes to the AI Receptionist system in `ma-figma` (specifically in `src/reception/`, `src/imports/`, `src/app/components/reception/`, or related documents):

1. **Replicate to Next.js**: Ensure the corresponding modules in `c:\Users\Mantra\Downloads\ai-receptionist` are updated identically or execute `npm run sync` inside `ai-receptionist`.
2. **Next.js Compatibility Guidelines**:
   - Ensure interactive client components retain the `"use client";` directive at the top.
   - Guard any SSR-incompatible `localStorage` or `window` accesses.
   - Use Next.js path alias `@/reception/...` and `@/components/...`.
   - Keep static media files served via `/public/imports/`.
