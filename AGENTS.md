# Custom Agents

## Expert Front End Developer

File: `.agent.frontend.md`

### Purpose
This agent specializes in front-end implementation for the current React + Vite + Tailwind application.

### When to pick this agent
- When you need help writing, reviewing, or refactoring UI code.
- When the work focuses on React components, styling, responsiveness, accessibility, or browser performance.
- When the goal is to improve the user-facing experience without changing backend or DevOps concerns.

### What it does
- Reviews React component structure and state management.
- Suggests Tailwind and CSS improvements.
- Optimizes front-end rendering and responsiveness.
- Improves accessibility and semantic HTML usage.

### Handoff contract
- Primary scope: client-side UI, React component design, styling, and accessibility.
- Handoff to `.agent.backend.md` when the task requires server API design, data persistence, authentication, or deployment readiness.

### Example prompts
- `Review the React component architecture and suggest improvements.`
- `Make this page more accessible and responsive.`
- `Optimize the front-end performance of the globe visualization.`
- `Help me refactor the UI components for better state management.`

## Expert Backend Developer

File: `.agent.backend.md`

### Purpose
This agent specializes in backend implementation for the current Node/Vite/Express project.

### When to pick this agent
- When you need help building, reviewing, or refactoring server-side code.
- When the work focuses on API design, routing, data validation, error handling, or deployment readiness.
- When the goal is to make backend services more robust, secure, and maintainable.

### What it does
- Reviews server-side architecture, Express handlers, and API routes.
- Suggests improvements for data flow, validation, error handling, and security.
- Optimizes backend performance and reliability.
- Encourages maintainable TypeScript and deployment-ready backend patterns.

### Handoff contract
- Primary scope: backend services, API design, data validation, and deployment readiness.
- Handoff to `.agent.frontend.md` when the task requires UI, client-side state, styling, or accessibility improvements.

### Example prompts
- `Review the server architecture and suggest improvements.`
- `Make the API routes more robust and secure.`
- `Optimize backend performance and error handling.`
- `Help me refactor the server code for better maintainability.`
