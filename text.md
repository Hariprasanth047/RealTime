# Real-Time Collaborative Task Management Application

Build a complete, production-quality **Real-Time Collaborative Task Management Application** similar to Trello, where multiple users can work on the same project and see changes instantly without refreshing the page.

## 1. Technology Stack

### Frontend

* React.js
* Vite
* JavaScript/TypeScript
* Tailwind CSS
* React Router
* Axios
* Socket.io-client

### Backend

* Node.js
* Express.js
* Socket.io
* JWT authentication
* bcrypt/bcryptjs for password hashing

### Database

* MongoDB
* Mongoose

### Development

* npm
* dotenv
* ESLint
* Git/GitHub

Do not replace the requested stack with another framework unless absolutely necessary.

---

# 2. Core Application Concept

The application should allow users to:

* Register and log in
* Create projects/workspaces
* Invite/add other users to projects
* Create task boards
* Create lists such as:

  * To Do
  * In Progress
  * Review
  * Completed
* Create tasks
* Assign tasks to users
* Set task priority
* Set due dates
* Add descriptions
* Add comments
* Move tasks between lists
* Edit and delete tasks
* Search and filter tasks
* See online project members
* Receive real-time updates
* Collaborate with multiple users simultaneously

The application must update changes in real time using **Socket.io**.

---

# 3. Authentication

Implement secure authentication.

Features:

* User registration
* User login
* Logout
* JWT authentication
* Protected routes
* Password hashing
* Authentication middleware
* Persistent login
* User profile

User model should contain fields such as:

* name
* email
* password
* avatar
* createdAt
* updatedAt

Never store plain-text passwords.

---

# 4. Dashboard

Create a modern dashboard after login.

Dashboard should display:

* Total projects
* Active tasks
* Completed tasks
* Overdue tasks
* Recently updated tasks
* User's projects
* Create Project button

Create a clean responsive UI suitable for desktop and mobile.

---

# 5. Project / Workspace System

Users should be able to:

* Create a project
* Edit project
* Delete project
* View project
* Add members
* Remove members
* View project members
* Assign roles

Project roles:

* Owner
* Admin
* Member

Implement appropriate authorization so users cannot modify projects they do not have permission to modify.

---

# 6. Kanban Task Board

Create a Trello-style Kanban board.

Default columns:

1. To Do
2. In Progress
3. Review
4. Completed

Users should be able to:

* Create columns
* Rename columns
* Delete columns
* Reorder columns
* Create tasks
* Move tasks
* Reorder tasks

Use drag-and-drop functionality.

When a task is moved, all connected users should immediately see the change.

---

# 7. Task Management

Each task should support:

* Title
* Description
* Status
* Priority
* Assignee
* Due date
* Labels/tags
* Comments
* Created by
* Created date
* Updated date

Priority levels:

* Low
* Medium
* High
* Urgent

Create a task modal/detail page where users can view and edit complete task information.

---

# 8. Real-Time Collaboration

This is the most important feature.

Use **Socket.io** for real-time communication.

Implement events such as:

* userJoinedProject
* userLeftProject
* taskCreated
* taskUpdated
* taskDeleted
* taskMoved
* taskAssigned
* commentAdded
* columnCreated
* columnUpdated
* columnDeleted
* projectUpdated

When User A changes a task, User B should see the change immediately without refreshing.

Use project-specific Socket.io rooms.

Example concept:

```text
Project A
   |
   └── Socket Room: project_A

User 1 ──┐
User 2 ──┼── Real-time updates
User 3 ──┘
```

---

# 9. Online Users

Display currently active users inside the project.

Show:

* User avatar
* User name
* Online/offline indicator

When a user joins a project, broadcast their presence.

When they leave, update the online-user list.

---

# 10. Comments

Users should be able to comment on tasks.

Each comment should contain:

* User
* Comment text
* Timestamp

Comments should also update in real time.

If User A comments on a task, User B should immediately see the new comment.

---

# 11. Search and Filtering

Implement task search and filtering.

Users should be able to filter by:

* Priority
* Assignee
* Status
* Due date
* Labels

Add a search box for task title and description.

---

# 12. Notifications

Create an in-app notification system.

Notify users when:

* A task is assigned to them
* Someone comments on their task
* Their task status changes
* They are added to a project
* A task they created is updated

Notifications should update in real time.

---

# 13. Backend API

Create a clean REST API.

Example endpoints:

Authentication:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

Projects:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

Tasks:

```text
GET    /api/projects/:projectId/tasks
POST   /api/projects/:projectId/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

Comments:

```text
GET  /api/tasks/:taskId/comments
POST /api/tasks/:taskId/comments
```

Members:

```text
POST   /api/projects/:projectId/members
DELETE /api/projects/:projectId/members/:userId
```

Use proper HTTP status codes and consistent JSON responses.

---

# 14. Database Models

Create Mongoose models for:

* User
* Project
* Board
* Column
* Task
* Comment
* Notification

Use appropriate relationships/references.

Add timestamps where useful.

Create indexes for frequently searched fields.

---

# 15. Security

Implement:

* JWT authentication
* Password hashing
* Authentication middleware
* Authorization middleware
* Input validation
* Request validation
* CORS configuration
* Environment variables
* Secure error handling
* Protection against unauthorized project/task access

Never expose passwords or sensitive information through API responses.

---

# 16. Frontend Pages

Create these pages:

### Public

* Login
* Register

### Authenticated

* Dashboard
* Projects
* Project Board
* Task Details
* Profile
* Notifications

Use React Router for navigation.

Protect authenticated routes.

---

# 17. UI/UX

Create a modern professional UI.

Requirements:

* Responsive design
* Desktop support
* Tablet support
* Mobile support
* Sidebar navigation
* Top navigation
* Modal dialogs
* Loading states
* Skeleton loaders
* Empty states
* Error messages
* Toast notifications
* Confirmation dialogs

Use a clean SaaS-style interface.

The application should look like a professional product rather than a basic college CRUD project.

---

# 18. Project Structure

Use a clean structure similar to:

```text
collab-task-board/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   ├── utils/
│   │   └── App.jsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── sockets/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
│
├── .env.example
├── README.md
└── package.json
```

Keep frontend and backend clearly separated.

---

# 19. Environment Variables

Create `.env.example`.

Backend example:

```text
PORT=5000
MONGODB_URI=mongodb://localhost:27017/collab_task_board
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

Do not commit actual secrets.

---

# 20. Error Handling

Implement centralized backend error handling.

Return consistent responses:

```json
{
  "success": false,
  "message": "Error message"
}
```

Successful responses should follow a similar structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Handle:

* Invalid authentication
* Unauthorized access
* Missing resources
* Invalid input
* Database errors
* Socket errors

---

# 21. Testing

Add basic testing for important backend APIs.

Test:

* Registration
* Login
* Authentication
* Project creation
* Task creation
* Task update
* Task deletion
* Authorization

Also test Socket.io events where practical.

---

# 22. README

Create a professional README containing:

* Project overview
* Features
* Technology stack
* Architecture
* Folder structure
* Installation
* Environment configuration
* MongoDB setup
* Running frontend
* Running backend
* Socket.io architecture
* API documentation
* Screenshots section
* Future improvements

Include exact commands required to run the application.

---

# 23. Development Requirements

Before finishing:

1. Install all required dependencies.
2. Verify the frontend builds successfully.
3. Verify the backend starts successfully.
4. Verify MongoDB connection.
5. Verify authentication.
6. Verify API endpoints.
7. Verify Socket.io connection.
8. Test real-time task creation.
9. Test real-time task movement.
10. Test real-time comments.
11. Fix runtime errors.
12. Fix console errors.
13. Fix API errors.
14. Make the UI responsive.

Do not leave placeholder functionality where a real implementation is expected.

---

# 24. Important Real-Time Scenario

The final application must successfully support this scenario:

```text
User A logs into Project X
             |
             ↓
User B logs into Project X
             |
             ↓
Both users join the same Socket.io room
             |
             ↓
User A creates a task
             |
             ↓
Server saves task to MongoDB
             |
             ↓
Server emits "taskCreated"
             |
             ↓
User B receives event
             |
             ↓
User B sees the new task instantly
```

The same mechanism should work for task movement, editing, deletion, comments, assignments, and other collaborative actions.

---

# 25. Final Quality Requirement

Build this as a **complete portfolio/resume-level project**, not as a simple demonstration.

Prioritize:

* Clean architecture
* Maintainable code
* Security
* Real-time functionality
* Good UI/UX
* Error handling
* Responsive design
* Proper database design
* REST API design
* WebSocket implementation

After implementation, run the application and verify that the major features work correctly.

If you encounter an error during implementation, diagnose the root cause and fix it rather than leaving the error unresolved.

At the end, provide:

1. Complete project structure
2. Installation commands
3. Environment variable setup
4. Database setup
5. Frontend run command
6. Backend run command
7. Test credentials if necessary
8. Summary of implemented features
9. Known limitations, if any
