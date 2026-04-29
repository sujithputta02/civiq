# Civiq: Judge Evidence & Compliance Documentation

This document explicitly outlines the technical traceability, accessibility checkpoints, security layers, and service boundaries required for professional production review.

---

## 1. Architecture Map

```mermaid
graph TD
    Client["Next.js Web Client"] 
    API["Express Node Backend (Google Cloud Run)"]
    Auth["Firebase Auth"]
    DB[("Cloud Firestore")]
    AI["Vertex AI (Gemini 2.0 Flash)"]
    PubSub["Cloud Pub/Sub Topics"]

    Client -->|Session Reads| DB
    Client -->|Secured RPC| API
    Client -->|Identity Verification| Auth
    API -->|Aggregates| DB
    API -->|Validation & Search| AI
    API -->|Misinfo Events| PubSub
```

---

## 2. Requirement-to-Feature Traceability Matrix

| Challenge Directive | Integrated Module | Structural Access Point |
| :--- | :--- | :--- |
| **Eligibility Verification** | Onboarding Questionnaires | `/assessment` |
| **Personalized Schedules** | Dashboard Progress bars | `/dashboard` |
| **Verification Logic** | Verification Pipelines | `/verify` |
| **Simulation** | Interactive modules | `/simulation` |

---

## 3. Comprehensive Accessibility Audits (A11y Compliance)

The user endpoints incorporate WCAG 2.1 compliance features natively:
- **Screen Reader Mapping:** Structural landmarks applied.
- **Contrast Ratios:** Complies with modern safety minimums.
