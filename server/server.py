import asyncio
import websockets

# Configuration
PORT = 8080
connected_clients = set()

async def handler(websocket):
    """
    Handles individual client connections.
    """
    print(f"New client connected from {websocket.remote_address}")
    connected_clients.add(websocket)
    
    try:
        async for message in websocket:
            # Broadcast the message to all OTHER clients
            # We use a copy of the set to avoid runtime errors if a client disconnects mid-loop
            for client in connected_clients.copy():
                if client != websocket and client.open:
                    try:
                        await client.send(message)
                    except websockets.exceptions.ConnectionClosed:
                        pass # Handle edge case where client drops during broadcast
    except websockets.exceptions.ConnectionClosed:
        pass # Normal disconnection
    finally:
        connected_clients.remove(websocket)
        print("Client disconnected")

async def main():
    print(f"Little Fighter 3 Python Server started on port {PORT}")
    print("Press Ctrl+C to stop.")
    # Bind to 0.0.0.0 to allow external connections (LAN/Internet)
    async with websockets.serve(handler, "0.0.0.0", PORT):
        await asyncio.get_running_loop().create_future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped.")

# Prerequisites:
# 1. Install Python
# 2. Run: pip install websockets
# 3. Run: python lf3_server.py