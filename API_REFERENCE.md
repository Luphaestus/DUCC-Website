# DUCC API Reference

Welcome to the DUCC (Durham University Canoe Club) API reference. This documentation describes the available endpoints, their required parameters, and expected responses.

## Authentication

### Sign Up
`POST /api/auth/signup`

Registers a new user account. Only Durham University email addresses are accepted.

**Request Body**
- `email` (string): Must be in the format `first.last@durham.ac.uk`.
- `password` (string): Minimum security requirements apply.
- `first_name` (string): User's first name.
- `last_name` (string): User's last name.

### Login
`POST /api/auth/login`

Authenticates a user and starts a session.

**Request Body**
- `email` (string)
- `password` (string)

### Logout
`GET /api/auth/logout`

Ends the current session and clears session cookies.

### Status
`GET /api/auth/status`

Returns the current authentication state.

**Response**
```json
{ "authenticated": true }
```

---

## Events

### List Events
`GET /api/events`

Returns all events visible to the current user based on their difficulty level.

### Weekly Events
`GET /api/events/rweek/:offset`

Returns events for a specific week relative to today.
- `offset` (integer): `0` for current week, `1` for next week, etc.

### Get Event Details
`GET /api/event/:id`

Returns full details for a specific event.

### Attendance Check
`GET /api/event/:id/isAttending`

Checks if the authenticated user is registered for the event.

### Join Event
`POST /api/event/:id/attend`

Registers the user for an event. Handles membership checks and upfront cost deductions.

### Leave Event
`POST /api/event/:id/leave`

Unregisters the user. Handles session restoration and refund logic (if before cutoff).

### List Attendees
`GET /api/event/:id/attendees`

Returns a list of users attending the event.

---

## User Profile

### Get Profile Elements
`GET /api/user/elements/:elements`

Retrieves specific fields for the authenticated user.
- `elements` (string): Comma-separated list (e.g., `first_name,email,balance`).

### Update Profile
`POST /api/user/elements`

Updates profile fields with server-side validation.

### Join as Member
`POST /api/user/join`

Deducts the membership fee and upgrades the user to full member status.

### Delete Account
`POST /api/user/deleteAccount`

Deactivates the user account. Only allowed if there are no outstanding debts.

---

## Admin Operations

### Manage Users
`GET /api/admin/users`

Paginated list of all users.
- Query Params: `page`, `limit`, `search`, `sort`, `order`.

### Manage Events
`GET /api/admin/events`

Paginated list of all events for administrative management.

### User Deep Dive
`GET /api/admin/user/:id`

Returns full profile, balance, transaction history, and assigned roles for a specific user.

### Update User Profile (Admin)
`POST /api/admin/user/:id/elements`

Updates user profile fields. Legacy permission flags are ignored.

### Role Management

#### List Roles
`GET /api/admin/roles`

Returns all defined roles and their permissions.

#### Create Role
`POST /api/admin/role`

Creates a new role.
- `name` (string)
- `description` (string)
- `permissions` (array of strings): List of permission slugs (e.g., `user.manage`).

#### Assign Role
`POST /api/admin/user/:id/role`

Assigns a role to a user.
- `roleId` (integer)

#### Remove Role
`DELETE /api/admin/user/:id/role/:roleId`

Removes a role from a user.

---

## Tags

### List Tags
`GET /api/tags`

Returns all available category and restriction tags.

### Manage Tags (Admin Only)
- `POST /api/tags`: Create new tag.
- `PUT /api/tags/:id`: Update existing tag.
- `DELETE /api/tags/:id`: Remove tag.

### Whitelist Management
- `GET /api/tags/:id/whitelist`: List users allowed for this tag.
- `POST /api/tags/:id/whitelist`: Add user to whitelist.
- `DELETE /api/tags/:id/whitelist/:userId`: Remove user from whitelist.

---

## Global Settings

### Get Globals
`GET /api/globals`

Returns system-wide configuration (e.g., MembershipCost). Restricted to President.

### Update Global
`POST /api/globals/:key`

Updates a specific system setting. Changing the `President` key requires password confirmation.

---

## Slideshow

### Get Images
`GET /api/slides/images`

Returns an array of URLs for the homepage hero slideshow.

### Random Slide
`GET /api/slides/random`

Returns a single random slide URL.
