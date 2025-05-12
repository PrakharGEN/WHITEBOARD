const express = require("express");
const app = express();
const server = require("http").createServer(app);
const { Server } = require("socket.io");
const cors = require("cors");

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("This is MERN realtime board sharing app official server by Prakhar Mishra");
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend's origin
    methods: ["GET", "POST"]
  }
});

// Track rooms and users
const rooms = {};
let roomIdGlobal, imgURLGlobal;

// Socket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle user joining a room
  socket.on("userJoined", (data) => {
    const { name, userId, roomId, host, presenter } = data;
    roomIdGlobal = roomId;
    
    // Join socket to the room
    socket.join(roomId);
    
    // Store userId in socket for later reference
    socket.data.userId = userId;
    socket.data.roomId = roomId;
    
    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
    }
    
    // Add user to the room
    rooms[roomId].add(userId);
    
    // Count users in the room
    const userCount = rooms[roomId].size;
    
    console.log(`User ${userId} joined room ${roomId}. Total users: ${userCount}`);
    
    // Confirm join to the user
    socket.emit("userIsJoined", { success: true });
    
    // Broadcast updated user count to ALL users in the room (presenter and viewers)
    io.to(roomId).emit("updateUserCount", { count: userCount });
    
    // Send the latest whiteboard data to the new user
    if (imgURLGlobal) {
      socket.emit("whiteBoardDataResponse", {
        imgURL: imgURLGlobal,
      });
    }
  });
  
  // Handle request for current user count (when a component mounts)
  socket.on("requestUserCount", () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms[roomId]) {
      socket.emit("updateUserCount", { count: rooms[roomId].size });
    }
  });
  
  // Handle whiteboard data updates
  socket.on("whiteboardData", (data) => {
    const roomId = socket.data.roomId || roomIdGlobal;
    imgURLGlobal = data;
    
    // Broadcast to others in the room
    socket.broadcast.to(roomId).emit("whiteBoardDataResponse", {
      imgURL: data,
    });
  });
  
  // Handle user leaving
  socket.on("leaveRoom", () => {
    handleUserDisconnect(socket);
  });
  
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    handleUserDisconnect(socket);
  });
});

// Helper function to handle user disconnect and room cleanup
function handleUserDisconnect(socket) {
  const userId = socket.data.userId;
  const roomId = socket.data.roomId;
  
  if (roomId && userId && rooms[roomId]) {
    // Remove user from room
    rooms[roomId].delete(userId);
    
    // Get updated count
    const userCount = rooms[roomId].size;
    console.log(`User ${userId} left room ${roomId}. Total users: ${userCount}`);
    
    // Broadcast updated count to ALL users in the room (presenter and viewers)
    io.to(roomId).emit("updateUserCount", { count: userCount });
    
    // Clean up empty rooms
    if (rooms[roomId].size === 0) {
      console.log(`Room ${roomId} is empty. Removing.`);
      delete rooms[roomId];
    }
    
    // Leave the socket room
    socket.leave(roomId);
  }
}

// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server is running on http://localhost:${port}`));