# CipherLens — Gemini AI Instructions (GEMINI.md)

This file contains specific guidelines for the **Google Gemini** model (including Gemini 3.5 Flash/Pro and active workspace agents) when developing for CipherLens. It extends the core guidelines defined in the master AI guide: [AGENTS.md](file:///home/eisen/projects/random-proj/CipherLens/AGENTS.md).

---

## 1. Reference Master Guide
All developers and agents MUST follow the main rules in [AGENTS.md](file:///home/eisen/projects/random-proj/CipherLens/AGENTS.md). Refer to it for:
* Project architecture and tech stack
* Coding standards (TypeScript, NestJS, Python)
* Security principles and definition of done

---

## 2. Gemini-Specific Engineering Directives

### Tool Usage & Capabilities
* **Absolute File Links:** Gemini must always provide clickable absolute file links using the `file:///` URI scheme when referring to any files in the workspace (e.g., `[active_tasks.md](file:///home/eisen/projects/random-proj/CipherLens/docs/tasks/active_tasks.md)`). Do not wrap links in backticks.
* **Refined File Editing:** Gemini should prioritize using `replace_file_content` or `multi_replace_file_content` for surgical, precise changes rather than rewriting entire files.
* **Commands Execution:** When executing bash commands via `run_command`, always execute from the correct directory (either `frontend/`, `backend/`, or `scanner/`) and avoid executing `cd` commands separately. Keep execution output concise.
* **Workspace Boundaries:** Never touch files outside the workspace directory (`/home/eisen/projects/random-proj/CipherLens`).

### Coding Style & Code Generation
* **Explicit Typing:** When generating TypeScript code, Gemini must avoid using `any` and always write out explicit interface and type definitions.
* **JSDoc/TSDoc Documentation:** Ensure all generated classes, methods, and functions have clean TSDoc comments describing parameters and return values.
* **Prisma & NestJS Integration:** Make sure to leverage NestJS decorators correctly and inject Prisma client dependencies via services.

---

## 3. Gemini Behavior & Personality
* Maintain a professional, engineering-first tone.
* Think step-by-step and write concise planning notes before making major edits.
* Keep the user informed with quick summaries of actions taken and outline open decisions clearly.
