export const Input = class {
    mouse = {
        x: 0, y: 0
    };
    mouse_prev = {
        x: 0, y: 0
    };
    click = {
        x: 0, y: 0
    };
    dragging = false;
    right_click = false;
    left_click = false;
    mouse_down_this_tick = 0b000;
    mouse_up_this_tick = 0b000;   
    last_mouse_down = performance.now();
    wheel_delta = 0;
    constructor() {
        const canvas = document.getElementById('canvas');
        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            let x = e.clientX - canvas.width / 2 - rect.x, y = e.clientY - canvas.height / 2 - rect.y;
            this.mouse = {x, y};
            if (this.dragging === false) 
                if (Math.hypot(x - this.click.x, y - this.click.y) > 20)
                    this.dragging = true;
        });

        canvas.addEventListener("mousedown", (e) => {
            const rect = canvas.getBoundingClientRect();
            if (e.button === 0)
                this.left_click = true;
            else if (e.button === 2)
                this.right_click = true;
            this.mouse_down_this_tick |= 1 << e.button;
            const x = e.clientX - canvas.width / 2 - rect.x;
            const y = this.click_mouse_y = e.clientY - canvas.height / 2 - rect.y;
            this.mouse = {x, y};
            this.click = {x, y};
            this.dragging = false;
            this.last_mouse_down = performance.now();
        });
        
        window.addEventListener("mouseup", (e) => {
            if (e.button === 0)
                this.left_click = false;
            else if (e.button === 2)
                this.right_click = false;
            this.mouse_up_this_tick |= 1 << e.button;
        });

        canvas.addEventListener("wheel", (e) => {
            this.wheel_delta = e.deltaY;
        });

        document.oncontextmenu = (e) => e.preventDefault();
    }
    reset() {
        this.mouse_prev = {...this.mouse};
        this.mouse_down_this_tick = this.mouse_up_this_tick = this.wheel_delta = 0;
    }
}