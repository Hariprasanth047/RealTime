const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Track online users per project: projectId -> Map(socketId -> userInfo)
const projectOnlineUsers = new Map();

const socketHandler = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.user.name})`);

    // Auto-join personal user room for direct notifications
    const userRoom = `user_${socket.user._id}`;
    socket.join(userRoom);

    // Update user online status in database
    User.findByIdAndUpdate(socket.user._id, { isOnline: true }).catch(console.error);

    // Join project room
    socket.on('joinProject', async ({ projectId }) => {
      if (!projectId) return;
      const room = `project_${projectId}`;
      socket.join(room);

      // Track online user in this project
      if (!projectOnlineUsers.has(projectId)) {
        projectOnlineUsers.set(projectId, new Map());
      }

      const userInfo = {
        _id: socket.user._id,
        name: socket.user.name,
        email: socket.user.email,
        avatar: socket.user.avatar,
        socketId: socket.id,
      };

      projectOnlineUsers.get(projectId).set(socket.id, userInfo);

      // Get all online users in this project (deduplicated by _id)
      const rawUsers = Array.from(projectOnlineUsers.get(projectId).values());
      const uniqueUsersMap = new Map();
      rawUsers.forEach((u) => uniqueUsersMap.set(u._id.toString(), u));
      const onlineUsers = Array.from(uniqueUsersMap.values());

      // Notify all members in room that this user joined
      socket.to(room).emit('userJoinedProject', {
        user: userInfo,
        onlineUsers,
      });

      // Send current online users list to the joining user
      socket.emit('onlineUsers', { projectId, onlineUsers });

      console.log(`👤 ${socket.user.name} joined project room: ${projectId} (${onlineUsers.length} online)`);
    });

    // Leave project room
    socket.on('leaveProject', ({ projectId }) => {
      if (!projectId) return;
      const room = `project_${projectId}`;
      socket.leave(room);

      if (projectOnlineUsers.has(projectId)) {
        projectOnlineUsers.get(projectId).delete(socket.id);
        const rawUsers = Array.from(projectOnlineUsers.get(projectId).values());
        const uniqueUsersMap = new Map();
        rawUsers.forEach((u) => uniqueUsersMap.set(u._id.toString(), u));
        const onlineUsers = Array.from(uniqueUsersMap.values());

        socket.to(room).emit('userLeftProject', {
          userId: socket.user._id,
          onlineUsers,
        });
      }

      console.log(`👤 ${socket.user.name} left project room: ${projectId}`);
    });

    // User is typing indicator
    socket.on('typing', ({ projectId, taskId }) => {
      if (!projectId) return;
      socket.to(`project_${projectId}`).emit('userTyping', {
        user: { _id: socket.user._id, name: socket.user.name },
        taskId,
      });
    });

    socket.on('stopTyping', ({ projectId, taskId }) => {
      if (!projectId) return;
      socket.to(`project_${projectId}`).emit('userStoppedTyping', {
        userId: socket.user._id,
        taskId,
      });
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${socket.user.name})`);

      // Remove from all project rooms
      for (const [projectId, users] of projectOnlineUsers.entries()) {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          const rawUsers = Array.from(users.values());
          const uniqueUsersMap = new Map();
          rawUsers.forEach((u) => uniqueUsersMap.set(u._id.toString(), u));
          const onlineUsers = Array.from(uniqueUsersMap.values());

          io.to(`project_${projectId}`).emit('userLeftProject', {
            userId: socket.user._id,
            onlineUsers,
          });
        }
      }

      // Update user offline status in DB
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      }).catch(console.error);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.user.name}:`, error);
    });
  });
};

module.exports = socketHandler;
