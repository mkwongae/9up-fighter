export class Network {
    constructor() {
        this.socket = null;
        this.isHost = false;
        this.myUserId = "user_" + Math.floor(Math.random() * 100000);
        this.callbacks = {};
    }

    connect(address, asHost, onOpen, onMessage, onClose, onError) {
        this.isHost = asHost;
        try {
            this.socket = new WebSocket(`ws://${address}`);
        } catch (e) {
            if (onError) onError(e);
            return;
        }

        this.socket.onopen = () => {
            console.log("Connected to WS Server");
            this.send({ type: 'join', id: this.myUserId, isHost: this.isHost });
            if (onOpen) onOpen();
        };

        this.socket.onmessage = (event) => {
            let msg;
            try {
                if (event.data instanceof Blob) return;
                msg = JSON.parse(event.data);
            } catch (e) { return; }

            if (onMessage) onMessage(msg);
        };

        this.socket.onerror = (e) => {
            console.error(e);
            if (onError) onError(e);
        };

        this.socket.onclose = () => {
            if (onClose) onClose();
        };
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }
}
