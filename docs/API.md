# Civiq API Documentation

## Overview

The Civiq API is a secure, rate-limited Express.js backend that provides election information verification and AI-powered assistance.

**Base URL**: `https://civiq-api-782079729240.us-central1.run.app`  
**API Version**: `v1`

---

## Authentication

All protected endpoints require a Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

### Token Requirements

- Must be a valid Firebase ID token
- Must not be expired
- Must be issued within the last 24 hours
- Session fingerprinting validates device consistency

---

## Endpoints

### POST /api/v1/verify

Verify a claim about elections using AI and web search.

**Authentication**: Required  
**Rate Limit**: 10 requests per 15 minutes

**Request Body**:

```json
{
  "claim": "string (required)",
  "context": "string (optional)"
}
```

**Response**:

```json
{
  "classification": "VERIFIED | UNVERIFIED | MISLEADING | FALSE",
  "explanation": "string",
  "source": "string (optional)"
}
```

**Example**:

```bash
curl -X POST https://civiq-api/api/v1/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"claim": "Is voting safe?"}'
```

---

### POST /api/v1/chat

Send a message to the AI assistant for election guidance.

**Authentication**: Required  
**Rate Limit**: 30 requests per minute

**Request Body**:

```json
{
  "userId": "string (required)",
  "message": "string (required)",
  "contextData": {
    "location": "string (optional)",
    "votingStatus": "string (optional)"
  },
  "explanationMode": "15s | 1m | deep (optional, default: 1m)"
}
```

**Response**:

```json
{
  "reply": "string"
}
```

---

### GET /api/v1/chat

Retrieve chat history for the authenticated user.

**Authentication**: Required  
**Rate Limit**: No limit

**Query Parameters**:

- `userId` (required): The user's Firebase UID

**Response**:

```json
{
  "history": [
    {
      "role": "user | model",
      "parts": [{ "text": "string" }]
    }
  ]
}
```

---

### POST /api/v1/logout

Clear the user's session.

**Authentication**: Required

**Response**:

```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### POST /api/v1/cron/reminders

Send deadline reminders to users (Cloud Scheduler only).

**Authentication**: Required (Cloud Scheduler secret header)  
**Rate Limit**: 1 request per hour

**Headers**:

- `X-Cloud-Scheduler-Secret`: Cloud Scheduler secret

**Response**:

```json
{
  "status": "success",
  "sent": 42
}
```

---

### GET /api/v1/admin/stats

Get aggregated myth verification statistics.

**Authentication**: Required  
**Rate Limit**: No limit

**Response**:

```json
{
  "totalQueries": 1000,
  "trueCount": 300,
  "falseCount": 200,
  "mixedCount": 500,
  "recentQueries": []
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### Common Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Security Features

- **Authentication**: Firebase ID token verification
- **Rate Limiting**: Per-endpoint rate limits to prevent abuse
- **Input Sanitization**: All user input sanitized to prevent injection
- **Session Hijacking Protection**: Device fingerprinting and IP validation
- **CORS**: Restricted to known origins
- **HTTPS**: Enforced in production
- **Headers**: Security headers via Helmet.js

---

## Rate Limiting

Rate limits are returned in response headers:

```
RateLimit-Limit: 10
RateLimit-Remaining: 9
RateLimit-Reset: 1234567890
```

When rate limit is exceeded, the API returns `429 Too Many Requests`.

---

## Pagination

Not currently implemented. Future versions will support pagination for list endpoints.

---

## Versioning

The API uses URL versioning (`/api/v1/`). Future versions will be available at `/api/v2/`, etc.

---

## Support

For issues or questions, please contact the development team or open an issue on GitHub.
