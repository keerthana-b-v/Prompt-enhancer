# Contributing to PromptRoute

First off, thank you for taking the time to contribute! 🎉

PromptRoute is a community-driven project built to democratize high-end prompting techniques directly in the browser. We welcome contributions of all forms: new techniques, performance fixes, styling polish, and documentation.

---

## Code of Conduct

By participating in this project, you agree to uphold our commitment to an inclusive, respectful, and safe community environment.

## How Can I Contribute?

### 1. Adding a New Prompting Technique
We love new techniques! Check out our [Technique Expansion Guide](../docs/adding-techniques.md) for a step-by-step walkthrough on how to write modular techniques.

### 2. Reporting Bugs
- Search existing issues to ensure the bug hasn't been reported.
- If it's a new issue, fill out our [Bug Report Template](./ISSUE_TEMPLATE/bug_report.md).
- Include browser console logs (F12) and steps to reproduce.

### 3. Submitting Pull Requests
1. Fork the repository and create your branch from `main`.
2. Install development packages: `npm install`
3. If modifying core logic, add appropriate Jest tests inside the `tests/` folder.
4. Run validation checks to ensure everything is correct:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
5. Ensure your commits are clear and concise.
6. Open your PR and fill out the details!

---

## Development Guidelines

### Code Style
- We use ESLint to maintain style consistency. Run `npm run lint` before committing.
- Do not use third-party libraries (like lodash) in core scripts; keep content scripts extremely lightweight.
- Ensure all styling variables are HSL-based or semantic in `content.css` to respect parent page dark/light shifts.

### Bundling
- Content and background scripts are compiled using `esbuild`.
- Run `npm run build` to generate the active bundles in `extension/dist/`.
- During active styling/UI iteration, run `npm run watch` to auto-compile changes.
