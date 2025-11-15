# Tooling Overview for This Project

This document summarizes the main tools I can use in this environment and how you can reference them when giving instructions.

---

## 1. Task & Planning

### `todowrite` / `todoread`
- Purpose: Track a simple TODO list for this coding session (steps, statuses, priorities).
- Typical instructions:
  - "Update your TODOs with the next steps before editing."
  - "Mark the implementation tasks as completed in your TODO list."

---

## 2. File & Shell Operations

### `bash`
- Purpose: Run shell commands in the repo (tests, builds, git, etc.).
- Typical instructions:
  - "Use bash to run `npm run dev`."
  - "Use bash to run `npm test` before committing."

### File access tools (workspace)
- `read` – Read any file from the filesystem.
- `write` – Overwrite a file’s contents (must read first if overwriting).
- `edit` – Do exact string replacement(s) inside a file.
- `list` – List files/directories.
- `glob` – Find files by pattern (e.g. `src/**/*.ts`).
- `grep` – Search file contents with a regex pattern.

Typical instructions:
- "Use `read` to open `src/contexts/app-context.tsx`."
- "Use `edit` to update the error message in `app-context.tsx`."
- "Use `glob` to find all `*.test.tsx` files under `tests/unit`."

---

## 3. Desktop Commander (Local File & Process Helper)

All tools here are prefixed `desktop-commander-global_`:

- File & directory management:
  - `read_file`, `read_multiple_files` – Read file contents (with offsets/length).
  - `write_file` – Write/append to files in small chunks.
  - `create_directory`, `move_file` – Manage directories and files.
  - `list_directory` – Tree/list view of directories.
- Processes:
  - `start_process` – Start a long-lived process (e.g., `python`, `node`, `bash`).
  - `read_process_output` – Read output from a running process.
  - `interact_with_process` – Send input to a running process.
- Search & metadata:
  - `start_search`, `get_more_search_results` – Progressive search for files or content.
  - `get_file_info` – File metadata (size, line counts, etc.).
  - `edit_block` – Surgical edits to a file’s content.

Typical instructions:
- "Use Desktop Commander `start_process` to run `npm run dev` and then `read_process_output` to monitor logs."
- "Use `list_directory` to explore the `src/` tree."
- "Use `edit_block` to patch that specific section of `app-context.tsx`."

---

## 4. Web, Docs, and Code Search

### `webfetch`
- Purpose: Fetch and summarize a single URL (HTML → markdown).
- Typical instructions: "Use `webfetch` to summarize this documentation page."

### Exa tools
- `exa-websearch_web_search_exa` – General web search with content scraping.
- `exa-websearch_get_code_context_exa` – Programming/API-focused search for code snippets & docs.

Typical instructions:
- "Use Exa code search to look up Next.js 15 routing behavior."
- "Use Exa web search to find best practices for React Suspense error handling."

### Ref-tools
- `ref_search_documentation` – Search official/public/private docs.
- `ref_read_url` – Read a documentation URL returned from `ref_search_documentation`.

Typical instructions:
- "Use `ref_search_documentation` to find Tailwind v4 docs."
- "Use `ref_read_url` to read the specific documentation page."

### Context7
- `context7-global-3k_resolve-library-id` – Map a library name → Context7 ID.
- `context7-global-3k_get-library-docs` – Fetch up-to-date docs for a given library ID.

Typical instructions:
- "Resolve the library ID for `next` and fetch its docs."

---

## 5. Kubernetes & Portainer

### Kubernetes tools
Two parallel namespaces are available (`kubernetes_*` and `kubernetes-global-npx_*`), but they provide similar capabilities:

- Cluster & resource operations:
  - `namespaces_list`, `pods_list`, `pods_list_in_namespace`, `pods_get`, `pods_delete`.
  - `pods_log`, `pods_exec` for logs and in-pod commands.
  - `resources_get`, `resources_list`, `resources_create_or_update`, `resources_delete`.
- Metrics & events:
  - `nodes_top`, `pods_top`, `events_list`.
- Helm operations:
  - `helm_install`, `helm_list`, `helm_uninstall`.

Typical instructions:
- "Use Kubernetes tools to get logs for the `frontend` pod in the `default` namespace."
- "Use `resources_create_or_update` to apply this deployment manifest."

### Portainer tools

There are two groups for different Portainer instances (`portainer-nas_*` and `portainer-windows_*`), but they expose similar operations:

- Environment and stack management:
  - List environments, stacks, access groups, tags, teams, and users.
  - `dockerProxy`, `kubernetesProxy` to proxy Docker or Kubernetes API calls through Portainer.
- Access control:
  - Update environment tags, user and team access policies.
- Stack updates:
  - Create or update stacks and environment groups.

Typical instructions:
- "Use Portainer NAS `dockerProxy` to list containers in environment 1."
- "Use `portainer-windows_listStacks` to see current stacks on the Windows host."

---

## 6. Git & GitHub

### Git (via `bash`)
- I use `bash` + `git` commands (`git status`, `git diff`, `git log`, etc.) to inspect and commit changes.

### GitHub-official tools

- Repository & branches:
  - `github-official_create_repository`, `github-official_create_branch`, `github-official_push_files`.
- Files:
  - `github-official_get_file_contents` to read files directly from GitHub.
- Issues:
  - `github-official_create_issue`, `github-official_update_issue`, `github-official_add_issue_comment`, `github-official_list_issues`, `github-official_get_issue`.
- Pull Requests:
  - `github-official_create_pull_request`, `github-official_list_pull_requests`, `github-official_get_pull_request`, `github-official_get_pull_request_files`, `github-official_create_pull_request_review`, `github-official_merge_pull_request`, `github-official_get_pull_request_status`, `github-official_update_pull_request_branch`, `github-official_get_pull_request_comments`, `github-official_get_pull_request_reviews`.
- Search:
  - `github-official_search_repositories`, `github-official_search_code`, `github-official_search_issues`, `github-official_search_users`.

Typical instructions:
- "Use GitHub tools to open a PR from branch `fix/dashboard-regression` to `main`."
- "Use `search_code` to find usages of `useApp` across the repo on GitHub."

---

## 7. OpenSpec / Change Management

There is no dedicated OpenSpec tool in this toolset; I manage OpenSpec through the filesystem using `read`/`write`/`edit`:

- Specs live under `openspec/specs/<capability>/spec.md`.
- Changes live under `openspec/changes/<change-id>/` with:
  - `proposal.md` – Why/what/impact.
  - `tasks.md` – Implementation checklist.
  - `specs/<capability>/spec.md` – Delta specs (ADDED/MODIFIED/REMOVED requirements).

Typical instructions:
- "Update the OpenSpec change `diagnose-dashboard-loading-regressions` to reflect the new local dev environment."
- "Add a new requirement under `openspec/changes/<id>/specs/dashboard-runtime/spec.md`."

---

## 8. Serena MCP (Project Analysis & Memory)

These tools are prefixed `serena_*`. Note: in this environment, full project activation is currently blocked by a Windows path issue, but calls are still visible and some tools are usable.

- Project configuration:
  - `serena_get_current_config` – Show Serena configuration, active project, tools, contexts.
  - `serena_activate_project` – Activate a project path for Serena.
- Code & search:
  - `serena_list_dir`, `serena_find_file`, `serena_search_for_pattern`.
  - `serena_get_symbols_overview`, `serena_find_symbol`, `serena_find_referencing_symbols`.
  - `serena_replace_symbol_body`, `serena_insert_after_symbol`, `serena_insert_before_symbol`, `serena_rename_symbol`.
- Memory:
  - `serena_write_memory`, `serena_list_memories`, `serena_read_memory`, `serena_edit_memory`, `serena_delete_memory`.
- Meta-thinking:
  - `serena_check_onboarding_performed`, `serena_onboarding`.
  - `serena_think_about_collected_information`, `serena_think_about_task_adherence`, `serena_think_about_whether_you_are_done`.
  - `serena_initial_instructions`.

Typical instructions:
- "Use Serena `search_for_pattern` to find where the dashboard spec lives."
- "Use Serena `think_about_task_adherence` before making refactors." 

---

## 9. Zen MCP (Analysis, Planning, Debugging, Tests)

These tools are prefixed `zen-mcp-server-desktop_*`. There is also a `custom-zen-mcp_*` namespace with similar capabilities.

### Core analysis & planning
- `zen-mcp-server-desktop_chat` – General expert chat/analysis.
- `zen-mcp-server-desktop_thinkdeep` – Multi-step deep investigation for complex problems.
- `zen-mcp-server-desktop_planner` – Stepwise planning, breaking tasks into ordered steps.
- `zen-mcp-server-desktop_consensus` – Multi-model consensus workflow for decisions.

### Code review & change safety
- `zen-mcp-server-desktop_codereview` – Structured multi-step code review.
- `zen-mcp-server-desktop_precommit` – Pre-commit validation of changes.
- `zen-mcp-server-desktop_analyze` – Codebase analysis (architecture, quality, etc.).
- `zen-mcp-server-desktop_refactor` – Refactoring analysis and opportunities.
- `zen-mcp-server-desktop_docgen` – Documentation generation for code.

### Debugging & security
- `zen-mcp-server-desktop_debug` – Root cause analysis for bugs.
- `zen-mcp-server-desktop_secaudit` – Security audit workflow.

### Tracing & tests
- `zen-mcp-server-desktop_tracer` – Trace call paths or dependencies.
- `zen-mcp-server-desktop_testgen` – Generate tests and test plans.

### Challenge & meta
- `zen-mcp-server-desktop_challenge` – Force a critical re-evaluation of a prior answer.
- `zen-mcp-server-desktop_listmodels` – List available models.
- `zen-mcp-server-desktop_version` – Zen MCP server version & config.

Typical instructions:
- "Use Zen `debug` on the dashboard loading regression using the OpenSpec change as context."
- "Use Zen `testgen` to design tests for `AppProvider`'s initial load behavior."

---

## 10. Browser Automation & UI Testing

### Playwright tools (`playwright-official_*`)
- Page control:
  - `browser_navigate`, `browser_navigate_back`, `browser_tabs`.
- Interactions:
  - `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, `browser_hover`.
- Inspection:
  - `browser_take_screenshot`, `browser_snapshot`, `browser_console_messages`, `browser_network_requests`, `browser_evaluate`.

Typical instructions:
- "Use Playwright MCP to open the local dashboard and take a screenshot after load."
- "Use Playwright to click through the setup flow and verify the profile is saved."

### Chrome DevTools tools (`chrome-devtools_*`)
- Navigation:
  - `navigate_page`, `new_page`, `select_page`, `close_page`.
- DOM interaction:
  - `click`, `hover`, `fill`, `drag`, `upload_file`, `press_key`.
- Inspection:
  - `take_snapshot`, `take_screenshot`, `list_console_messages`, `get_console_message`, `list_network_requests`, `get_network_request`.
- Performance:
  - `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`.

Typical instructions:
- "Use the Chrome DevTools MCP to capture console logs and network requests for `http://localhost:3000/`."
- "Use `take_snapshot` to inspect the accessible tree of the dashboard page."

---

## 11. TTS and Voice

### `tts-mcp-server_*`
- `tts-mcp-server_speak_text` – Speak text using the configured TTS backend (system, gtts, espeak, or ElevenLabs).
- `tts-mcp-server_list_voices` – List available voices.

I am currently using ElevenLabs (e.g., `service: "elevenlabs"`, model `eleven_flash_v2_5`) for spoken status updates.

Typical instructions:
- "Use `tts-mcp-server_speak_text` with ElevenLabs to announce major progress updates."

### `voice-mode_*`
- `voice-mode_converse` – Full duplex voice conversation (speak + listen) via STT/TTS services.
- `voice-mode_service` – Manage underlying services (`whisper`, `kokoro`, `livekit`, etc.).

Typical instructions:
- "Start a `voice-mode_converse` session to talk through the architecture while I listen."

---

## 12. Multi-tool Orchestration

### `multi_tool_use.parallel`
- Purpose: Run multiple tools in parallel when they can operate independently (e.g., read several files + run a search at the same time).

Typical instructions:
- "Use the `parallel` tool to read these three files and run a grep across `src/` concurrently."

---

## How to Reference Tools in Instructions

When you want me to favor or explicitly use a specific tool, you can phrase instructions like:

- "Use Serena `search_for_pattern` to locate all usages of `useApp`."
- "Use Zen `debug` to investigate the dashboard regression."
- "Use Chrome DevTools MCP to gather console and network evidence from the local dashboard."
- "Use `desktop-commander-global_start_process` to launch `npm run dev` and then inspect logs with `read_process_output`."

This document should give you an accurate picture of what I can do and how to steer me toward the tools you prefer for a given task.
