/**
 * Real-Time Socket.io Multi-User Collaboration Test
 * Simulates two concurrent users collaborating in the same project room.
 */
const { io: Client } = require('socket.io-client');
const { request } = require('./testApi');

const SOCKET_URL = 'http://localhost:5000';

function waitForEvent(socket, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event "${eventName}" on socket ${socket.id}`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runRealtimeTest() {
  console.log('====================================================');
  console.log('  STARTING REAL-TIME COLLABORATION MULTI-CLIENT TEST');
  console.log('====================================================\n');

  const ts = Date.now();
  const userAEmail = `alice_realtime_${ts}@taskflow.com`;
  const userBEmail = `bob_realtime_${ts}@taskflow.com`;

  let socketA = null;
  let socketB = null;

  try {
    // 1. Register User A and User B
    console.log('1. Registering User A (Alice) and User B (Bob)...');
    const regA = await request('/auth/register', 'POST', { name: 'Alice Smith', email: userAEmail, password: 'password123' });
    const tokenA = regA.body.data.token;
    const userA = regA.body.data.user;

    const regB = await request('/auth/register', 'POST', { name: 'Bob Jones', email: userBEmail, password: 'password123' });
    const tokenB = regB.body.data.token;
    const userB = regB.body.data.user;
    assert(tokenA && tokenB, 'Both users registered and tokens received');

    // 2. User A creates Project and adds User B
    console.log('\n2. User A creates project and invites User B...');
    const projRes = await request('/projects', 'POST', { name: 'Real-Time Sync Project', color: '#6366f1', icon: '⚡' }, tokenA);
    const project = projRes.body.data.project;
    const projectId = project._id;

    await request(`/projects/${projectId}/members`, 'POST', { email: userBEmail, role: 'member' }, tokenA);
    assert(projectId, `Project created: ${project.name} (${projectId})`);

    // Get default columns
    const colsRes = await request(`/projects/${projectId}/columns`, 'GET', null, tokenA);
    const todoCol = colsRes.body.data.columns.find((c) => c.name === 'To Do');
    const inProgressCol = colsRes.body.data.columns.find((c) => c.name === 'In Progress');

    // 3. Connect Socket A and Socket B
    console.log('\n3. Connecting WebSockets for User A and User B...');
    socketA = Client(SOCKET_URL, { auth: { token: tokenA }, transports: ['websocket'] });
    socketB = Client(SOCKET_URL, { auth: { token: tokenB }, transports: ['websocket'] });

    await Promise.all([
      new Promise((res) => socketA.on('connect', res)),
      new Promise((res) => socketB.on('connect', res)),
    ]);
    assert(socketA.connected && socketB.connected, 'Both Socket clients connected to server');

    // 4. User A joins project room
    console.log('\n4. User A joins project room...');
    socketA.emit('joinProject', { projectId });
    const onlineUsersA = await waitForEvent(socketA, 'onlineUsers');
    assert(onlineUsersA.onlineUsers.length >= 1, `User A received onlineUsers list (${onlineUsersA.onlineUsers.length} user)`);

    // 5. User B joins project room
    console.log('\n5. User B joins project room...');
    const userJoinedPromise = waitForEvent(socketA, 'userJoinedProject');
    socketB.emit('joinProject', { projectId });
    
    const joinedData = await userJoinedPromise;
    assert(joinedData.user._id === userB._id, `User A received "userJoinedProject" event for ${joinedData.user.name}`);

    // 6. User A creates a task -> User B receives taskCreated
    console.log('\n6. User A creates task -> User B receives real-time taskCreated event...');
    const taskCreatedPromise = waitForEvent(socketB, 'taskCreated');
    const createTaskRes = await request(`/projects/${projectId}/tasks`, 'POST', {
      title: 'Implement WebSocket Sync',
      description: 'Collaborative real-time sync testing',
      columnId: todoCol._id,
      priority: 'high',
      assignees: [userB._id],
    }, tokenA);
    const createdTask = createTaskRes.body.data.task;

    const receivedTaskEvent = await taskCreatedPromise;
    assert(receivedTaskEvent.task._id === createdTask._id, `User B received "taskCreated" event for "${receivedTaskEvent.task.title}"`);

    // 7. User A moves task -> User B receives taskMoved
    console.log('\n7. User A moves task to In Progress -> User B receives real-time taskMoved event...');
    const taskMovedPromise = waitForEvent(socketB, 'taskMoved');
    await request(`/tasks/${createdTask._id}/move`, 'PUT', { columnId: inProgressCol._id, order: 0 }, tokenA);

    const movedData = await taskMovedPromise;
    assert(movedData.task._id === createdTask._id && movedData.toColumn === inProgressCol._id, 'User B received "taskMoved" event immediately');

    // 8. User A updates task priority -> User B receives taskUpdated
    console.log('\n8. User A updates task priority to urgent -> User B receives real-time taskUpdated event...');
    const taskUpdatedPromise = waitForEvent(socketB, 'taskUpdated');
    await request(`/tasks/${createdTask._id}`, 'PUT', { priority: 'urgent' }, tokenA);

    const updatedData = await taskUpdatedPromise;
    assert(updatedData.task.priority === 'urgent', 'User B received "taskUpdated" event with priority = urgent');

    // 9. User A emits typing indicator -> User B receives userTyping
    console.log('\n9. User A types comment -> User B receives userTyping indicator...');
    const typingPromise = waitForEvent(socketB, 'userTyping');
    socketA.emit('typing', { projectId, taskId: createdTask._id });
    const typingData = await typingPromise;
    assert(typingData.user._id === userA._id, `User B received typing indicator for ${typingData.user.name}`);

    // 10. User A adds comment -> User B receives commentAdded and direct notification
    console.log('\n10. User A adds comment -> User B receives commentAdded and notification events...');
    const commentAddedPromise = waitForEvent(socketB, 'commentAdded');
    const notificationPromise = waitForEvent(socketB, 'notification');

    await request(`/tasks/${createdTask._id}/comments`, 'POST', { text: 'Task is moving fast in real-time!' }, tokenA);

    const commentData = await commentAddedPromise;
    assert(commentData.comment.text === 'Task is moving fast in real-time!', 'User B received "commentAdded" event');

    const notifData = await notificationPromise;
    assert(notifData.type === 'comment_added', `User B received direct real-time notification: "${notifData.message}"`);

    // 11. User A creates new column -> User B receives columnCreated
    console.log('\n11. User A creates new column "QA" -> User B receives columnCreated event...');
    const columnCreatedPromise = waitForEvent(socketB, 'columnCreated');
    const newColRes = await request(`/projects/${projectId}/columns`, 'POST', { name: 'QA Review', color: '#ec4899' }, tokenA);
    const newCol = newColRes.body.data.column;

    const colData = await columnCreatedPromise;
    assert(colData.column.name === 'QA Review', 'User B received "columnCreated" event for QA Review');

    // 12. User A renames column -> User B receives columnUpdated
    console.log('\n12. User A renames column -> User B receives columnUpdated event...');
    const columnUpdatedPromise = waitForEvent(socketB, 'columnUpdated');
    await request(`/columns/${newCol._id}`, 'PUT', { name: 'QA & Staging' }, tokenA);

    const updatedColData = await columnUpdatedPromise;
    assert(updatedColData.column.name === 'QA & Staging', 'User B received "columnUpdated" event');

    // 13. User A deletes task -> User B receives taskDeleted
    console.log('\n13. User A deletes task -> User B receives taskDeleted event...');
    const taskDeletedPromise = waitForEvent(socketB, 'taskDeleted');
    await request(`/tasks/${createdTask._id}`, 'DELETE', null, tokenA);

    const deletedData = await taskDeletedPromise;
    assert(deletedData.taskId === createdTask._id, 'User B received "taskDeleted" event');

    // 14. User B leaves project -> User A receives userLeftProject
    console.log('\n14. User B leaves project -> User A receives userLeftProject event...');
    const userLeftPromise = waitForEvent(socketA, 'userLeftProject');
    socketB.emit('leaveProject', { projectId });

    const leftData = await userLeftPromise;
    assert(leftData.userId === userB._id, 'User A received "userLeftProject" event');

    console.log('\n====================================================');
    console.log('  🎉 ALL REAL-TIME COLLABORATION TESTS PASSED 100%!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ REAL-TIME TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
  }
}

if (require.main === module) {
  runRealtimeTest();
}

module.exports = { runRealtimeTest };
