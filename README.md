# TaskFlow — Real-Time Collaborative Task Management Application

A full-stack, production-quality **Real-Time Collaborative Task Management Application** inspired by Trello. Teams can create workspaces, organize tasks on interactive Kanban boards with drag-and-drop, track progress, comment on tasks, and see all changes instantly across active users without reloading the page.

---

## 🚀 Features

- **Authentication & Security**
  - Secure JWT authentication with persistent user sessions
  - Encrypted passwords with `bcryptjs`
  - Granular role-based access control (`Owner`, `Admin`, `Member`)
  - User profile management (avatar, bio, password updates)
- **Interactive Kanban Boards**
  - Drag-and-drop task movement across columns with `@dnd-kit`
  - Default status columns: *To Do*, *In Progress*, *Review*, *Completed*
  - Custom column creation, renaming, and deletion
- **Task Management**
  - Detailed task modals with title, rich description, priority, due date, tags/labels, assignees, and completion tracking
  - Priority levels (*Low*, *Medium*, *High*, *Urgent*) with visual badges
  - Task search by keyword and filtering by priority, assignee, status, or due date
- **Real-Time Collaboration (Socket.io)**
  - Instant synchronization of task creation, movement, updates, and deletions across all connected users
  - Real-time comment threads on tasks with active typing indicators
  - Project-specific Socket rooms (`project_<id>`) for isolated workspace broadcasting
  - Live active online member indicators
- **Notification System**
  - In-app notification center with real-time alerts
  - Instant notification on task assignments, comments, status changes, and project invitations
  - Mark-as-read and clear-all capabilities
- **Modern SaaS UI/UX**
  - Dark-mode glassmorphic aesthetic styled with Tailwind CSS
  - Responsive layout optimized for desktop, tablet, and mobile devices
  - Toast notifications and loading state skeletons

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS & Glassmorphic Custom Design System
- **Routing**: React Router DOM v6
- **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **HTTP Client**: Axios
- **Real-Time**: Socket.io Client
- **Notifications & UI**: `react-hot-toast`, `date-fns`

### Backend
- **Runtime**: Node.js & Express.js
- **Real-Time Engine**: Socket.io Server
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Database**: MongoDB with Mongoose ODM
- **Validation**: express-validator & centralized error handling

---

## 📁 Project Structure

```text
collab-task-board/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI components (Avatar, Modal, Badges, Loaders)
│   │   ├── context/            # AuthContext, SocketContext, NotificationContext
│   │   ├── layouts/            # AppLayout with sidebar & header
│   │   ├── pages/              # Login, Register, Dashboard, Projects, ProjectBoard, TaskDetail, Profile, Notifications
│   │   ├── services/           # Axios API services & endpoints
│   │   ├── App.jsx             # Main router & provider setup
│   │   ├── main.jsx            # React root entrypoint
│   │   └── index.css           # Tailwind base styles & custom classes
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                     # Backend Application
│   ├── src/
│   │   ├── controllers/        # Auth, Project, Task, Column, Comment, Notification controllers
│   │   ├── middleware/         # JWT Auth, Role checking, Centralized error handling
│   │   ├── models/             # User, Project, Column, Task, Comment, Notification schemas
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── sockets/            # Socket.io room & event handlers
│   │   ├── utils/              # Token generation & helper utilities
│   │   └── server.js           # Server & Socket initialization
│   ├── tests/                  # API integration test suite
│   ├── .env.example
│   └── package.json
│
├── .env.example
├── package.json                # Root orchestration scripts
└── README.md
```

---

## ⚡ Installation & Setup

### 1. Prerequisites
- **Node.js**: v18 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or a MongoDB Atlas connection string.

### 2. Clone & Install Dependencies

You can install all root, server, and client dependencies with:

```bash
npm run install:all
```

Or install separately:

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

---

## ⚙️ Environment Configuration

### Server Configuration
Create a `.env` file in the `server/` directory (or use `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/collab_task_board
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🏃 Running the Application

### Option A: Run Both Simultaneously (Recommended)
From the root directory:

```bash
npm run dev
```

### Option B: Run Individually

**Start the Backend Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Start the Frontend Client:**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 📡 Socket.io Real-Time Architecture

TaskFlow uses room-based WebSocket channels to isolate project data and broadcast events efficiently:

```text
               Client (User 1)          Client (User 2)
                      │                        │
                      │  joinProject (Room)    │  joinProject (Room)
                      ▼                        ▼
               ┌──────────────────────────────────────┐
               │    Socket.io Room: project_12345     │
               └──────────────────────────────────────┘
                                  ▲
                                  │ (taskCreated, taskMoved, commentAdded)
               ┌──────────────────────────────────────┐
               │       Express / Socket Server        │
               │   MongoDB CRUD & Instant Broadcast   │
               └──────────────────────────────────────┘
```

### Real-Time Events
| Event Name | Direction | Description |
| :--- | :--- | :--- |
| `joinProject` | Client ➔ Server | User joins a project's real-time room |
| `leaveProject` | Client ➔ Server | User exits project view |
| `onlineUsers` | Server ➔ Client | Broadcasts current active online members |
| `taskCreated` | Server ➔ Room | Emitted when a new task is added |
| `taskMoved` | Server ➔ Room | Emitted when a task is dragged to a new column |
| `taskUpdated` | Server ➔ Room | Emitted on task editing or status change |
| `taskDeleted` | Server ➔ Room | Emitted when a task is removed |
| `commentAdded` | Server ➔ Room | Broadcasts new comments in real-time |
| `typing` / `stopTyping` | Bidirectional | Real-time typing indicators in task comments |

---

## 📋 REST API Reference

### Authentication
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Get authenticated user details
- `PUT /api/auth/profile` — Update user profile information
- `PUT /api/auth/password` — Change account password

### Projects
- `GET /api/projects` — Fetch all projects for authenticated user
- `POST /api/projects` — Create a new project (auto-generates default Kanban columns)
- `GET /api/projects/:id` — Get single project details and members
- `PUT /api/projects/:id` — Update project metadata (Admin/Owner only)
- `DELETE /api/projects/:id` — Delete project (Owner only)
- `POST /api/projects/:projectId/members` — Add member to workspace
- `DELETE /api/projects/:projectId/members/:userId` — Remove member

### Tasks & Columns
- `GET /api/projects/:projectId/tasks` — List tasks with search and filtering
- `POST /api/projects/:projectId/tasks` — Create task inside a column
- `GET /api/tasks/:id` — Retrieve task detail with comments and assignees
- `PUT /api/tasks/:id` — Update task details
- `PUT /api/tasks/:id/move` — Move task between columns / change order
- `DELETE /api/tasks/:id` — Delete task
- `GET /api/projects/:projectId/columns` — List columns in project
- `POST /api/projects/:projectId/columns` — Add new column

### Comments & Notifications
- `GET /api/tasks/:taskId/comments` — Get comments for a task
- `POST /api/tasks/:taskId/comments` — Add comment to task
- `GET /api/notifications` — Get user notifications
- `PUT /api/notifications/:id/read` — Mark notification as read
- `PUT /api/notifications/read-all` — Mark all notifications as read

---

## 🧪 Testing

Run the automated backend integration test suite against a running server:

```bash
cd server
npm test
```

---

## 🔑 Demo Account
- **Email**: `demo@taskflow.com`
- **Password**: `demo123`
*(Or register any new account instantly via the UI)*
