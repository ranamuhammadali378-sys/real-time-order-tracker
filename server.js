const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// Temporary order data
let orders = [
  {
    id: "ORD-1001",
    customer: "Ali",
    product: "Laptop",
    status: "Processing",
  },
  {
    id: "ORD-1002",
    customer: "Ahmed",
    product: "Mobile Phone",
    status: "Shipped",
  },
];

// HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// REST API
app.get("/api/v1/orders", (req, res) => {
  res.json({
    success: true,
    orders: orders,
  });
});

// Get single order
app.get("/api/v1/orders/:id", (req, res) => {
  const order = orders.find(
    (item) => item.id === req.params.id
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.json({
    success: true,
    order: order,
  });
});

// Update order status
app.put("/api/v1/orders/:id/status", (req, res) => {
  const order = orders.find(
    (item) => item.id === req.params.id
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  order.status = req.body.status;

  // Send real-time update
  io.emit("orderStatusUpdated", order);

  res.json({
    success: true,
    message: "Order status updated",
    order: order,
  });
});

// JSON-RPC
app.post("/rpc", (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== "2.0") {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid JSON-RPC request",
      },
      id: id,
    });
  }

  if (method === "cancelOrder") {
    const order = orders.find(
      (item) => item.id === params.orderId
    );

    if (!order) {
      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: "Order not found",
        },
        id: id,
      });
    }

    order.status = "Cancelled";

    io.emit("orderStatusUpdated", order);

    return res.json({
      jsonrpc: "2.0",
      result: {
        message: "Order cancelled successfully",
        order: order,
      },
      id: id,
    });
  }

  res.json({
    jsonrpc: "2.0",
    error: {
      code: -32601,
      message: "Method not found",
    },
    id: id,
  });
});

// SSE - Server Sent Events
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(
    `data: ${JSON.stringify({
      message: "Connected to live events",
    })}\n\n`
  );

  const interval = setInterval(() => {
    res.write(
      `data: ${JSON.stringify({
        message: "Live system alert",
        time: new Date().toLocaleTimeString(),
      })}\n\n`
    );
  }, 10000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinOrderRoom", (orderId) => {
    socket.join(orderId);

    console.log(
      `${socket.id} joined order room ${orderId}`
    );
  });

  socket.on("chatMessage", (message) => {
    io.to(message.orderId).emit("chatMessage", {
      sender: message.sender,
      message: message.message,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});