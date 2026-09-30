// =============================
// BACKEND URL
// =============================

// Backend is running on port 3000
const BACKEND_URL = "http://localhost:3000";


// =============================
// SOCKET.IO CONNECTION
// =============================

const socket = io(BACKEND_URL);


// =============================
// REST API - LOAD ORDERS
// =============================

async function loadOrders() {

  try {

    const response = await fetch(
      `${BACKEND_URL}/api/v1/orders`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load orders: ${response.status}`
      );
    }

    const data = await response.json();

    const ordersDiv =
      document.getElementById("orders");

    ordersDiv.innerHTML = "";

    data.orders.forEach((order) => {

      ordersDiv.innerHTML += `
        <div class="order">

          <strong>${order.id}</strong>

          <p>
            Customer: ${order.customer}
          </p>

          <p>
            Product: ${order.product}
          </p>

          <p>
            Status:
            <strong>${order.status}</strong>
          </p>

        </div>
      `;

    });

  } catch (error) {

    console.error("Load orders error:", error);

    alert("Could not load orders.");

  }

}


// =============================
// UPDATE ORDER STATUS
// =============================

async function updateStatus() {

  const orderId =
    document.getElementById("orderId").value.trim();

  const status =
    document.getElementById("status").value;

  if (!orderId) {

    alert("Please enter Order ID.");

    return;

  }


  try {

    const url =
      `${BACKEND_URL}/api/v1/orders/${encodeURIComponent(orderId)}/status`;

    console.log("Updating order:", url);
    console.log("New status:", status);


    const response = await fetch(
      url,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          status: status
        })
      }
    );


    const text =
      await response.text();

    console.log(
      "Status API response:",
      text
    );


    let data;

    try {

      data = JSON.parse(text);

    } catch (parseError) {

      console.error(
        "JSON parse error:",
        parseError
      );

      throw new Error(
        `Server returned non-JSON response. HTTP ${response.status}`
      );

    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        `Status update failed. HTTP ${response.status}`
      );

    }


    alert(
      data.message ||
      "Status updated successfully!"
    );


    console.log(
      "Updated order:",
      data.order
    );


    // Refresh order list
    loadOrders();


  } catch (error) {

    console.error(
      "Update status error:",
      error
    );

    alert(
      "Update failed: " +
      error.message
    );

  }

}


// =============================
// JSON-RPC
// =============================

async function cancelOrder() {

  const orderId =
    document
      .getElementById("cancelOrderId")
      .value
      .trim();


  if (!orderId) {

    alert("Please enter Order ID.");

    return;

  }


  try {

    const response = await fetch(
      `${BACKEND_URL}/rpc`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          jsonrpc: "2.0",

          method: "cancelOrder",

          params: {
            orderId: orderId
          },

          id: 1

        })
      }
    );


    const data =
      await response.json();


    if (data.result) {

      alert(
        data.result.message
      );

    } else if (data.error) {

      alert(
        data.error.message
      );

    }


    loadOrders();


  } catch (error) {

    console.error(
      "JSON-RPC error:",
      error
    );

    alert(
      "JSON-RPC request failed."
    );

  }

}


// =============================
// SSE
// =============================

const eventSource =
  new EventSource(
    `${BACKEND_URL}/events`
  );


eventSource.onmessage =
  (event) => {

    try {

      const data =
        JSON.parse(event.data);


      document.getElementById(
        "events"
      ).innerHTML = `

        <p>
          ${data.message}
        </p>

        <small>
          ${data.time || ""}
        </small>

      `;

    } catch (error) {

      console.error(
        "SSE message error:",
        error
      );

    }

  };


eventSource.onerror =
  (error) => {

    console.error(
      "SSE connection error:",
      error
    );

  };


// =============================
// SOCKET.IO
// =============================

function joinOrderRoom() {

  const orderId =
    document
      .getElementById("chatOrderId")
      .value
      .trim();


  if (!orderId) {

    return;

  }


  socket.emit(
    "joinOrderRoom",
    orderId
  );

}


socket.on(
  "connect",
  () => {

    console.log(
      "Socket connected:",
      socket.id
    );

    joinOrderRoom();

  }
);


socket.on(
  "connect_error",
  (error) => {

    console.error(
      "Socket connection error:",
      error
    );

  }
);


socket.on(
  "orderStatusUpdated",
  (order) => {

    alert(
      `Order ${order.id} status changed to ${order.status}`
    );

    loadOrders();

  }
);


socket.on(
  "chatMessage",
  (data) => {

    const chat =
      document.getElementById("chat");


    chat.innerHTML += `

      <p>

        <strong>
          ${data.sender}:
        </strong>

        ${data.message}

      </p>

    `;

  }
);


// =============================
// SEND CHAT MESSAGE
// =============================

function sendMessage() {

  const orderId =
    document
      .getElementById("chatOrderId")
      .value
      .trim();


  const sender =
    document
      .getElementById("sender")
      .value
      .trim();


  const message =
    document
      .getElementById("message")
      .value
      .trim();


  if (!message) {

    alert(
      "Please enter a message."
    );

    return;

  }


  socket.emit(
    "chatMessage",
    {
      orderId: orderId,
      sender: sender,
      message: message
    }
  );


  document.getElementById(
    "message"
  ).value = "";

}


// =============================
// LOAD ORDERS WHEN PAGE OPENS
// =============================

loadOrders();