# CipherLens — Claude AI Instructions (CLAUDE.md)

This file contains specific guidelines for the **Anthropic Claude** model (including Claude 3.5 Sonnet and desktop/IDE integrations) when developing for CipherLens. It extends the core guidelines defined in the master AI guide: [AGENTS.md](file:///home/eisen/projects/random-proj/CipherLens/AGENTS.md).

---

## 1. Reference Master Guide
All developers and agents MUST follow the main rules in [AGENTS.md](file:///home/eisen/projects/random-proj/CipherLens/AGENTS.md). Refer to it for:
* Project architecture and tech stack
* Coding standards (TypeScript, NestJS, Python)
* Security principles and definition of done

---

## 2. Claude-Specific Engineering Directives

### Coding Style & Code Generation
* **React and Hooks:** When building components, ensure strict custom hooks design for separating UI state/rendering and logic/API calls.
* **NestJS & Dependency Injection:** Respect NestJS module bounds. Do not import services directly without declaring them in their parent module exports.
* **Error Handling:** When writing backend endpoints, always return explicit NestJS Exception filters or custom HttpExceptions rather than generic errors.

### Tool Usage & Capabilities
* **Absolute File Links:** Claude must always provide clickable absolute file links using the `file:///` URI scheme when referring to any files in the workspace (e.g., `[active_tasks.md](file:///home/eisen/projects/random-proj/CipherLens/docs/tasks/active_tasks.md)`). Do not wrap links in backticks.
* **XML Tags Usage:** Claude works best when utilizing internal XML blocks for structuring thinking and planning stages before executing files edits.
* **Context Preservation:** Avoid writing massive markdown summaries of changes inside the chat interface; instead, create or update artifacts or write detailed inline code comments.

---

## 3. Claude Behavior & Personality
* Adopt an architect-level persona with a focus on type safety and software craftsmanship.
* Write modular, testable, and highly cohesive implementations.
