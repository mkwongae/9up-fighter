export class Input {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            a: false,
            s: false,
            d: false
        };
        this.lastTap = { key: '', time: 0 };
        this.touchMap = {
            'd-up': 'ArrowUp',
            'd-down': 'ArrowDown',
            'd-left': 'ArrowLeft',
            'd-right': 'ArrowRight',
            'btn-atk': 'a',
            'btn-jmp': 's',
            'btn-def': 'd'
        };

        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', e => {
            if (this.keys.hasOwnProperty(e.key)) {
                if (!this.keys[e.key]) {
                    const now = Date.now();
                    // Double tap logic can be handled here or exposed
                    if (this.lastTap.key === e.key && now - this.lastTap.time < 250) {
                        this.onDoubleTap(e.key);
                    }
                    this.lastTap = { key: e.key, time: now };
                }
                this.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', e => {
            if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
        });

        document.querySelectorAll('.d-btn, .act-btn').forEach(el => {
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                for (let c in this.touchMap) {
                    if (el.classList.contains(c)) this.keys[this.touchMap[c]] = true;
                }
            });
            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (let c in this.touchMap) {
                    if (el.classList.contains(c)) this.keys[this.touchMap[c]] = false;
                }
            });
        });

        window.addEventListener('touchstart', function t() {
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) mobileControls.style.display = 'block';
            window.removeEventListener('touchstart', t);
        });
    }

    onDoubleTap(key) {
        // This will be assigned by the Game or Player class
        if (this.doubleTapHandler) {
            this.doubleTapHandler(key);
        }
    }

    setDoubleTapHandler(handler) {
        this.doubleTapHandler = handler;
    }
}
