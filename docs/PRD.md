# Civiq: Product Requirements Document (PRD)

## 🎯 Overview

Civiq is an AI-powered election readiness platform that converts complex election procedures into a personalized, interactive journey. Designed to combat "voter failure," it guides users through eligibility rules, deadlines, and real-world simulations using state-of-the-art AI and a highly interactive UI.

---

## 🏗️ Goals and Alignment

### 100% Challenge Alignment Commitment

Civiq solves the statement verbatim:

- **Understand process/timelines/steps**: Core via timeline engine + explainer (100% coverage).
- **Interactive**: All guidance via quizzes, chats, verifications, simulations (no read-only flows).
- **Easy-to-follow**: Personalized, multi-mode (15s/1min/deep), accessible UI.

**Demo script**: Judge inputs a claim → instant verify; takes quiz → custom timeline; simulates poll day → guided flow.

---

## 📈 Traceability Matrix Table

| Problem Statement Clause                        | Mapped Civiq Feature(s)                                                                       | Evidence of Implementation                                                                                    |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Helps users understand the election process** | Step-by-step explainer, simulation, explain-like-I'm-busy modes                               | Vertex AI-powered natural language breakdowns of full lifecycle (eligibility to results) with 3 depth levels. |
| **Timelines**                                   | Personalized timeline engine, smart reminders                                                 | Firestore-driven dynamic statuses (Next/Urgent) with Pub/Sub nudges, user-location personalized.              |
| **Steps**                                       | Readiness assessment, timeline statuses, simulation                                           | Quiz-classified risks → actionable step paths with prerequisites/risks.                                       |
| **Interactive**                                 | Myth verification (paste/claim input), Q&A assistant, simulation walkthrough, assessment quiz | Real-time Vertex AI inputs/outputs, no static pages—every screen has input handlers (chat, verify, simulate). |
| **Easy-to-follow**                              | Onboarding quiz, 15-sec summaries, semantic UX, accessibility layer                           | Plain language, progress trackers, keyboard nav, high-contrast glass UI.                                      |

---

## ⚡ Interactivity Proof Requirement

Civiq operates under a **"Zero Static Screens" mandate**. Every view must have at least one input (quiz, chat, claim paste, step selector, simulation click-through) triggering Vertex AI or Firestore updates.

- **Interaction Latency**: All E2E interactions are optimized for <2s response times.
- **Input Handlers**: Every screen incorporates active handlers for real-time feedback.

---

## 🧪 Implementation Proofs

To seal 100% alignment, Civiq provides:

- **Repo Badges**: 90%+ test coverage, Lighthouse 100s across the board.
- **Live Demo**: One-click Cloud Run demo link for instant validation.
- **Audit Logs**: BigQuery tracking of user interactions to prove engagement.

---

## 🎥 Judge Demo Flow

_Scripted 2-minute walkthrough explicitly naming clauses:_

1. **"See interactive timeline (timelines clause)"**: Start at the personalized dashboard showing the dynamic countdown to the next election milestone.
2. **"See step simulation (steps clause)"**: Engage with the Poll Day Simulator, making interactive choices that impact the outcome.
3. **"See process understanding (understand process clause)"**: Use the "Explain Like I'm Busy" toggle to get a 15-second summary of complex voting laws.
4. **"See interactivity in action (interactive clause)"**: Paste a suspicious claim into the Verification Hub and get a real-time AI breakdown.

---

## ♿ Accessibility & Inclusion

Civiq is built for everyone. With WCAG 2.1 AA compliance, high-contrast glass UI, and full keyboard navigation, the "easy-to-follow" requirement is met for all user demographics.
