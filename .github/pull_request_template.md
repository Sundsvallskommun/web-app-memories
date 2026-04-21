# Pull Request

## Description

Briefly describe what was changed and why (for both frontend and backend if relevant).

## Background & Motivation

Why was this change needed? Describe any related issues if applicable.

If applicable, link the related work item (Jira story/issue, Azure DevOps work item, GitLab issue, GitHub issue..)

## General Checklist

- [ ] PR follows code style and standards
- [ ] E2E tests (Cypress) have been executed, and new tests have been added if required
- [ ] Project builds locally without errors
- [ ] ESLint/Prettier have been run and are OK
- [ ] API changes are documented (OpenAPI/README)
- [ ] Environment variables updated if necessary

## Manual Regression Testing – REQUIRED\*\*

The author of the PR **must** verify that the changes do not break existing functionality.

### Frontend – Next.js

- [ ] All affected pages render correctly (SSR/CSR)
- [ ] Navigation works
- [ ] API calls from the frontend continue to work
- [ ] Any forms/flows function correctly
- [ ] Mobile/desktop tested (if relevant)

### Backend – Express.js

- [ ] Affected endpoints behave as expected
- [ ] No changes break existing contracts
- [ ] Error handling works correctly
- [ ] Logging behaves normally
- [ ] Protected endpoints validated (auth/session/JWT)
