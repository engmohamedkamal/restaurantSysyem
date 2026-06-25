const socket = io("http://localhost:3000");

// socket.on("connect", () => {
//     console.log("Connected to server! Socket ID:", socket.id);

//     // Send "hi" event to the server
//     socket.emit("hi", "Hello from client!", (response) => {
//         console.log("Response from server:", response);
//     });
// });

// socket.on("disconnect", () => {
//     console.log("Disconnected from server");
// });
