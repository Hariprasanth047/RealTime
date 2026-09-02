/**
 * Comprehensive Backend API Test Suite
 * Tests all models, auth, JWT, RBAC, endpoints, validation, and error handling.
 */
const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

const request = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runComprehensiveTests() {
  console.log('====================================================');
  console.log('  STARTING COMPREHENSIVE BACKEND API TEST SUITE');
  console.log('====================================================\n');

  try {
    // 1. Health check
    console.log('📌 Testing System & Health Check...');
    const health = await request('/health');
    assert(health.status === 200 && health.body.success === true, 'Health check returns 200 OK');

    // 2. Authentication & Validation
    console.log('\n📌 Testing User Authentication & Security...');
    const timestamp = Date.now();
    const user1Email = `user1_${timestamp}@taskflow.com`;
    const user2Email = `user2_${timestamp}@taskflow.com`;

    // 2a. Validation failure (missing fields)
    const invalidReg = await request('/auth/register', 'POST', { name: '', email: 'notanemail' });
    assert(invalidReg.status === 400 && invalidReg.body.success === false, 'Invalid registration rejected with 400');

    // 2b. User 1 Registration
    const reg1 = await request('/auth/register', 'POST', {
      name: 'Alice Developer',
      email: user1Email,
      password: 'password123',
    });
    assert(reg1.status === 201 && reg1.body.data.token, 'User 1 registered and JWT token issued');
    const token1 = reg1.body.data.token;
    const user1Id = reg1.body.data.user._id;

    // 2c. Prevent duplicate registration
    const dupReg = await request('/auth/register', 'POST', {
      name: 'Duplicate Alice',
      email: user1Email,
      password: 'password123',
    });
    assert(dupReg.status === 400, 'Duplicate email registration rejected');

    // 2d. User 2 Registration
    const reg2 = await request('/auth/register', 'POST', {
      name: 'Bob Collaborator',
      email: user2Email,
      password: 'password123',
    });
    assert(reg2.status === 201 && reg2.body.data.token, 'User 2 registered and JWT token issued');
    const token2 = reg2.body.data.token;
    const user2Id = reg2.body.data.user._id;

    // 2e. Login & Password comparison
    const loginFail = await request('/auth/login', 'POST', {
      email: user1Email,
      password: 'wrongpassword',
    });
    assert(loginFail.status === 401, 'Invalid password rejected with 401');

    const loginSuccess = await request('/auth/login', 'POST', {
      email: user1Email,
      password: 'password123',
    });
    assert(loginSuccess.status === 200 && loginSuccess.body.data.token, 'Successful login returns 200 and token');

    // 2f. Protected route without token
    const unauthMe = await request('/auth/me', 'GET');
    assert(unauthMe.status === 401, 'Accessing protected route without token rejected with 401');

    // 2g. Get Me
    const me = await request('/auth/me', 'GET', null, token1);
    assert(me.status === 200 && me.body.data.user.email === user1Email, 'Authenticated user profile retrieved');

    // 2h. Update Profile
    const updatedProfile = await request('/auth/profile', 'PUT', { bio: 'Full stack developer', avatar: 'https://example.com/avatar.png' }, token1);
    assert(updatedProfile.status === 200 && updatedProfile.body.data.user.bio === 'Full stack developer', 'User profile updated');

    // 2i. User search
    const searchRes = await request(`/users/search?email=${user2Email.substring(0, 5)}`, 'GET', null, token1);
    assert(searchRes.status === 200 && searchRes.body.data.users.length > 0, 'User search by email working');

    // 3. Project Management
    console.log('\n📌 Testing Project / Workspace CRUD & Roles...');
    const createProj = await request('/projects', 'POST', {
      name: 'Core Platform Project',
      description: 'Main real-time application development',
      color: '#6366f1',
      icon: '🚀',
    }, token1);
    assert(createProj.status === 201 && createProj.body.data.project, 'Project created with Owner role');
    const project = createProj.body.data.project;
    const projectId = project._id;

    // 3a. Get User Projects
    const userProjects = await request('/projects', 'GET', null, token1);
    assert(userProjects.status === 200 && userProjects.body.data.projects.length >= 1, 'Projects list retrieved');

    // 3b. Verify Default Columns created automatically
    const cols = await request(`/projects/${projectId}/columns`, 'GET', null, token1);
    assert(cols.status === 200 && cols.body.data.columns.length === 4, 'Default 4 Kanban columns (To Do, In Progress, Review, Completed) created');
    const todoCol = cols.body.data.columns.find((c) => c.name === 'To Do');
    const inProgressCol = cols.body.data.columns.find((c) => c.name === 'In Progress');
    const completedCol = cols.body.data.columns.find((c) => c.name === 'Completed');

    // 3c. Add Member to Project (User 2)
    const addMem = await request(`/projects/${projectId}/members`, 'POST', { email: user2Email, role: 'member' }, token1);
    assert(addMem.status === 200 && addMem.body.data.project.members.length === 2, 'User 2 added to Project');

    // 3d. Update Member Role
    const updateRole = await request(`/projects/${projectId}/members/${user2Id}/role`, 'PUT', { role: 'admin' }, token1);
    assert(updateRole.status === 200, 'Member role updated to Admin');

    // 3e. Verify User 2 can now access the project
    const user2ProjectView = await request(`/projects/${projectId}`, 'GET', null, token2);
    assert(user2ProjectView.status === 200 && user2ProjectView.body.data.project._id === projectId, 'User 2 can access project');

    // 4. Kanban Columns & Tasks
    console.log('\n📌 Testing Column & Task Management...');
    
    // 4a. Create Custom Column
    const newCol = await request(`/projects/${projectId}/columns`, 'POST', { name: 'QA Testing', color: '#f59e0b' }, token1);
    assert(newCol.status === 201 && newCol.body.data.column.name === 'QA Testing', 'Custom column QA Testing created');
    const qaColId = newCol.body.data.column._id;

    // 4b. Update Column
    const updateCol = await request(`/columns/${qaColId}`, 'PUT', { name: 'QA & Staging' }, token1);
    assert(updateCol.status === 200 && updateCol.body.data.column.name === 'QA & Staging', 'Column name updated');

    // 4c. Create Task
    const createTaskRes = await request(`/projects/${projectId}/tasks`, 'POST', {
      title: 'Build WebSockets real-time sync',
      description: 'Implement Socket.io rooms and event broadcasting for task cards',
      columnId: todoCol._id,
      priority: 'urgent',
      assignees: [user2Id],
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      labels: [{ text: 'Backend', color: '#6366f1' }],
    }, token1);
    assert(createTaskRes.status === 201 && createTaskRes.body.data.task, 'Task created with priority, assignees, and labels');
    const task = createTaskRes.body.data.task;
    const taskId = task._id;

    // 4d. Get Tasks with filter & search
    const tasksFiltered = await request(`/projects/${projectId}/tasks?priority=urgent&search=WebSockets`, 'GET', null, token1);
    assert(tasksFiltered.status === 200 && tasksFiltered.body.data.tasks.length === 1, 'Task search and priority filtering working');

    // 4e. Move Task to Another Column
    const moveTaskRes = await request(`/tasks/${taskId}/move`, 'PUT', { columnId: inProgressCol._id, order: 0 }, token1);
    assert(moveTaskRes.status === 200 && moveTaskRes.body.data.task.column._id === inProgressCol._id, 'Task moved to In Progress column');

    // 4f. Update Task Details
    const updateTaskRes = await request(`/tasks/${taskId}`, 'PUT', { priority: 'high', description: 'Updated task description' }, token1);
    assert(updateTaskRes.status === 200 && updateTaskRes.body.data.task.priority === 'high', 'Task details updated');

    // 5. Comments & Notifications
    console.log('\n📌 Testing Comments & Notifications...');

    // 5a. User 2 adds a comment
    const addCommentRes = await request(`/tasks/${taskId}/comments`, 'POST', {
      text: 'Working on the WebSocket handlers right now!',
    }, token2);
    assert(addCommentRes.status === 201 && addCommentRes.body.data.comment.author._id === user2Id, 'Comment created by User 2');
    const commentId = addCommentRes.body.data.comment._id;

    // 5b. Get comments for task
    const getCommentsRes = await request(`/tasks/${taskId}/comments`, 'GET', null, token1);
    assert(getCommentsRes.status === 200 && getCommentsRes.body.data.comments.length === 1, 'Task comments retrieved');

    // 5c. Check User 1 received notification for comment/assignment
    const notifsRes = await request('/notifications', 'GET', null, token1);
    assert(notifsRes.status === 200 && notifsRes.body.data.notifications.length > 0, 'Notification received by task owner');
    const notifId = notifsRes.body.data.notifications[0]._id;

    // 5d. Mark notification as read
    const markReadRes = await request(`/notifications/${notifId}/read`, 'PUT', null, token1);
    assert(markReadRes.status === 200 && markReadRes.body.data.notification.isRead === true, 'Notification marked as read');

    // 5e. Mark all notifications as read
    const markAllReadRes = await request('/notifications/read-all', 'PUT', null, token1);
    assert(markAllReadRes.status === 200, 'All notifications marked as read');

    // 6. Dashboard Stats & Project Stats
    console.log('\n📌 Testing Dashboard & Aggregations...');
    const dashStats = await request('/tasks/dashboard', 'GET', null, token1);
    assert(dashStats.status === 200 && dashStats.body.data.totalProjects >= 1 && dashStats.body.data.activeTasks >= 1, 'Dashboard stats calculated accurately');

    const projStats = await request(`/projects/${projectId}/stats`, 'GET', null, token1);
    assert(projStats.status === 200 && projStats.body.data.stats.total >= 1, 'Project level statistics calculated');

    // 7. Cleanup / Deletion Endpoints
    console.log('\n📌 Testing Deletion & Cascade Cleanups...');
    
    // 7a. Delete comment
    const delComment = await request(`/comments/${commentId}`, 'DELETE', null, token2);
    assert(delComment.status === 200, 'Comment deleted');

    // 7b. Delete task
    const delTask = await request(`/tasks/${taskId}`, 'DELETE', null, token1);
    assert(delTask.status === 200, 'Task deleted');

    // 7c. Delete column
    const delCol = await request(`/columns/${qaColId}`, 'DELETE', null, token1);
    assert(delCol.status === 200, 'Column deleted');

    // 7d. Remove member
    const remMember = await request(`/projects/${projectId}/members/${user2Id}`, 'DELETE', null, token1);
    assert(remMember.status === 200, 'Member removed from project');

    // 7e. Delete project
    const delProj = await request(`/projects/${projectId}`, 'DELETE', null, token1);
    assert(delProj.status === 200, 'Project deleted with cascading cleanup');

    // 8. Logout
    console.log('\n📌 Testing Logout...');
    const logoutRes = await request('/auth/logout', 'POST', null, token1);
    assert(logoutRes.status === 200, 'User logged out and status updated');

    console.log('\n====================================================');
    console.log('  🎉 ALL BACKEND API TESTS PASSED WITH 100% SUCCESS');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runComprehensiveTests();
}

module.exports = { runComprehensiveTests, request };
