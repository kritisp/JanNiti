# JanNiti AI API Documentation

This document outlines the core endpoints for interacting with the JanNiti AI orchestration backend. For full schema details and interactive testing, please visit the auto-generated Swagger UI at `/docs` when the server is running.

---

### `POST /submit`
Submits a new citizen issue and kicks off the 6-agent AI workflow asynchronously in the background.

- **Request Body**: `CitizenRequest` (JSON)
  - `text` (str): Raw text description of the issue.
  - `language` (str, optional): Language of the text.
  - `location` (str): Location of the issue.
  - `image_url` (str, optional): URL of an attached image.
  - `audio_url` (str, optional): URL of an attached audio file.
- **Response**: `202 ACCEPTED`
  - Returns a `SubmitResponse` containing the `request_id` needed to poll for status.

---

### `POST /demo/run/{id}`
Loads a pre-configured demo request by its ID and executes the complete AI workflow **synchronously**.

- **Path Parameters**:
  - `id` (str): The ID of the demo request to run.
- **Response**: `200 OK`
  - Returns the final, fully-populated structured `AgentState` JSON object.

---

### `GET /analytics`
Returns AI-generated analytics and metrics based on all completed workflows in the system.

- **Response**: `200 OK`
  - Returns an `AnalyticsResponse` containing `issues_by_language` (count) and `average_priority_score` (float).

---

### `GET /dashboard`
Returns aggregate throughput statistics on all submitted workflows.

- **Response**: `200 OK`
  - Returns a `DashboardStatsResponse` detailing counts for `total_requests`, `completed`, `failed`, and `in_progress`.

---

### `GET /report/{id}`
Extracts and returns only the final generated policy briefing for a completed citizen request workflow.

- **Path Parameters**:
  - `id` (str): The unique request ID returned from `/submit`.
- **Response**: `200 OK`
  - Returns a `PolicyBriefing` JSON object containing Markdown, HTML, PDF-ready content, and multilingual translations/audio links.
- **Errors**:
  - `400 BAD REQUEST` if the workflow is still running.
  - `404 NOT FOUND` if the workflow ID does not exist.

---

### `GET /workflow/{id}`
Returns the current execution status (in_progress, completed, failed) and the full AgentState if the workflow is completed.

- **Path Parameters**:
  - `id` (str): The unique request ID returned from `/submit`.
- **Response**: `200 OK`
  - Returns a `WorkflowStatusResponse`. If the status is `completed`, the `workflow_data` field will contain the full execution state.
- **Errors**:
  - `404 NOT FOUND` if the workflow ID does not exist.
