# Chrono API Documentation

## Auth
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Login and receive JWT. Supports 2FA.
- `POST /api/auth/forgot-password`: Initiate password recovery (email/SMS).
- `POST /api/auth/reset-password`: Reset password using code.

## Users
- `GET /api/users/:username`: Get user profile.
- `PUT /api/users/:username`: Update user profile.
- `GET /api/users/search/:query`: Search users.
- `POST /api/users/:username/follow`: Follow user.
- `POST /api/users/:username/unfollow`: Unfollow user.
- `POST /api/users/:username/glitchi`: Send a Glitchi effect (Limit: 3/24h).
- `GET /api/users/me/audit-logs`: Get security audit logs.

## Conversations (DMs)
- `GET /api/conversations`: Get all conversations.
- `POST /api/conversations/get-or-create`: Find or start a DM.
- `GET /api/conversations/:id/messages`: Get messages in a conversation.
- `POST /api/conversations/:id/messages`: Send a message (Supports text, image, video).
- `POST /api/conversations/:id/messages/:messageId/status`: Update status (delivered/read).

## Posts
- `GET /api/posts`: Get feed posts.
- `POST /api/posts`: Create a post.
- `DELETE /api/posts/:id`: Delete a post.
- `POST /api/posts/:id/reaction`: React to a post.
- `POST /api/posts/:id/echo`: Repost a post.

## Security Features
- **E2E Encryption**: All DMs are encrypted end-to-end.
- **Audit Logs**: All sensitive actions (login, security changes) are logged.
- **2FA**: Two-factor authentication available via settings.
- **Rate Limiting**: 100 req/min per IP.
- **Data Privacy**: Strict PII scrubbing in all API responses.
