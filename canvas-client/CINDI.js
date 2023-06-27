'use strict';

const is_within = (point_1, point_2, point_test) => {
    if (point_1 > point_2)
        return point_2 < point_test && point_test <= point_1;
    else
        return point_1 < point_test && point_test <= point_2;
}

/** DESC[] */
class CloudBoundary {
    /** @public */
    points = []; // [x, y] array
    center_x = 0;
    center_y = 0; 
    /** @public */
    hovered = false;
    
    constructor () {}
    get length() { return this.points.length }
    /**
     * @param {number} x 
     * @param {number} y 
     */
    add(x, y) { 
        this.points.push([x, y]);
        if (this.length > 1 && (this.points[0][0] === x && this.points[0][1] === y))
            return;

        this.center_x = (this.center_x * (this.points.length - 1) + x) / this.points.length;
        this.center_y = (this.center_y * (this.points.length - 1) + y) / this.points.length;
        console.log(this.center_x, this.center_y);
    }
    pop() {
        const [x, y] = this.points.pop(); 
        if (this.length === 0)
        {
            this.center_x = this.center_y = 0;
        }
        else
        {
            this.center_x = (this.center_x * (this.points.length + 1) - x) / this.points.length;
            this.center_y = (this.center_y * (this.points.length + 1) - y) / this.points.length;
        }
    }
    /**
     * @returns {CloudBoundary}
     */
    clone() { 
        const clone = new CloudBoundary;
        clone.points = [...this.points];
        clone.center_x = this.center_x;
        clone.center_y = this.center_y;
        return clone;
    }
    reset() {
        this.points = [];
    }
    /**
     * @param {number} x 
     * @param {number} y 
     * @returns {null}
     */
    contains(x,y)
    {
        const len = this.length;
        if (len < 3)
            return;
        let h_count = 0, v_count = 0;
        for (let i = 0; i < len - 1; ++i)
        {
            const [x1, y1] = this.points[i];
            const [x2, y2] = this.points[i+1];
            if (is_within(x1, x2, x))
            {
                //line_intersect();
                const lerp = (y1 == y2) ? 0.5 : (x - x1) / (x2 - x1);
                const proj_y = y1 + lerp * (y2 - y1);
                if (proj_y > y)
                    ++v_count;
            }
            if (is_within(y1, y2, y))
            {
                //another line_intersect();
                const lerp = (x1 == x2) ? 0.5 : (y - y1) / (y2 - y1);
                const proj_x = x1 + lerp * (x2 - x1);
                if (proj_x > x)
                    ++h_count;
            }
        }
        const [x1, y1] = this.points[len - 1];
        const [x2, y2] = this.points[0];
        if (is_within(x1, x2, x))
        {
            //line_intersect();
            const lerp = (y1 == y2) ? 0.5 : (x - x1) / (x2 - x1);
            const proj_y = y1 + lerp * (y2 - y1);
            if (proj_y > y)
                ++v_count;
        }
        if (is_within(y1, y2, y))
        {
            //another line_intersect();
            const lerp = (x1 == x2) ? 0.5 : (y - y1) / (y2 - y1);
            const proj_x = x1 + lerp * (x2 - x1);
            if (proj_x > x)
                ++h_count;
        }
        return (this.hovered = !!((h_count * v_count) & 1));
    }
}

class ImageHandler {
    index = 45;
    image_loaded = false;
    cache_image = new Image();
    cache_canvas = new OffscreenCanvas(1088,533); //almost all images are this size
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    image_srcs = [];
    
    paths = [];
    curr_path = new CloudBoundary;
    right_click = false;
    left_click = false;
    mouse_x = 0;
    mouse_y = 0;
    //position of last mousedown
    click_mouse_x = 0;
    click_mouse_y = 0;
    dragging = false;
    transform = new Float64Array([1,0,0,1,0,0]); //x1, y1, x2, y2, x, y. represents the 2x3 representation of a DOMMatrix
    focused_on = null; // path that is hovered over
    
    constructor() {
        this.cache_image.onload = () => {
            this.image_loaded = true;
            this.cache_canvas.getContext('2d').drawImage(this.cache_image, -82, -60);
        }
        
        this.canvas.addEventListener("mousemove", (e) => {
            e.preventDefault();
            let x = e.clientX, y = e.clientY;
            if (!this.dragging && (this.left_click || this.right_click) && Math.hypot(x - this.click_mouse_x, y - this.click_mouse_y > 15))
                this.dragging = true;
            if (!this.left_click && !this.right_click && !this.dragging) {
                this.mouse_x = x;
                this.mouse_y = y;
            }
            else if (this.dragging) {
                //translate the canvas
                const dx = x - this.mouse_x, dy = y - this.mouse_y;
                this.mouse_x = x;
                this.mouse_y = y;
                this.transform[4] += dx;
                this.transform[5] += dy;
            }
        });

        this.canvas.addEventListener("mousedown", (e) => {
            e.preventDefault();
            if (e.button === 0)
                this.left_click = true;
            else if (e.button === 2)
                this.right_click = true;
            this.mouse_x = this.click_mouse_x = e.clientX;
            this.mouse_y = this.click_mouse_y = e.clientY;
            this.dragging = false;
        });
        
        this.canvas.addEventListener("mouseup", (e) => {
            e.preventDefault();
            if (e.button === 0)
                this.left_click = false;
            else if (e.button === 2)
                this.right_click = false;
            
            if (e.button === 0 && !this.dragging) {
                let x = (e.clientX - this.transform[4]) / this.transform[0], y = (e.clientY - this.transform[5]) / this.transform[3];
                if (this.curr_path.length > 2) {
                    let start_x = this.curr_path.points[0][0], start_y = this.curr_path.points[0][1];
                    if (Math.hypot(start_x - x, start_y - y) < 8 / this.transform[0]) {
                        x = start_x; y = start_y;
                        this.curr_path.add(x, y);
                        this.paths.push(this.curr_path.clone());
                        this.curr_path.reset();
                        return;
                    }
                }
                this.curr_path.add(x, y);
            }
            this.dragging = false;
        });

        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            const offset_x = this.mouse_x - this.transform[4],
            offset_y = this.mouse_y - this.transform[5];
            const before_scale_x = this.transform[0],
            before_scale_y = this.transform[3];
            if (e.deltaY > 0) {
                this.transform[0] *= 1.1;
                this.transform[3] *= 1.1;
            }
            else {
                this.transform[0] /= 1.1;
                this.transform[3] /= 1.1;
            }
            this.transform[4] += (before_scale_x - this.transform[0]) / before_scale_x * offset_x;
            this.transform[5] += (before_scale_y - this.transform[3]) / before_scale_y * offset_y;
        });

        document.addEventListener("keyup", (e) => {
            if (e.code === 'Minus' || e.code === 'Equal')
            {
                const offset_x = this.mouse_x - this.transform[4],
                offset_y = this.mouse_y - this.transform[5];
                const before_scale_x = this.transform[0],
                before_scale_y = this.transform[3];
                if (e.code === 'Equal') {
                    this.transform[0] *= 1.1;
                    this.transform[3] *= 1.1;
                }
                else {
                    this.transform[0] /= 1.1;
                    this.transform[3] /= 1.1;
                }
                this.transform[4] += (before_scale_x - this.transform[0]) / before_scale_x * offset_x;
                this.transform[5] += (before_scale_y - this.transform[3]) / before_scale_y * offset_y;
            }
            else if (e.code === 'KeyZ' && e.ctrlKey)
            {
                if (this.curr_path.length > 0)
                {
                    this.curr_path.pop();
                }
                else
                {
                    if (this.paths.length > 0)
                    {
                        this.curr_path = this.paths.pop();
                        this.curr_path.pop();
                    }
                }
            }
        });

        document.oncontextmenu = (e) => e.preventDefault();
    }

    /**
     * @param {String} date 
     * @returns {boolean}
     */
    async request_date(date) {
        let resp = await fetch("http://127.0.0.1:8081/", {
            method: "POST",
            body: date,
        }).then((resp) => resp.text());
        try {
            this.image_srcs = JSON.parse(resp);
            return true;
        } catch (e) {
            console.log(e + " | Please try again");
            return false;
        }
    }

    /**
     * @returns {boolean}
     */
    async request_image()
    {
        this.paths = [];
        this.focused_on = null;
        this.curr_path.reset();
        this.image_loaded = false;
        let resp2 = await fetch("http://127.0.0.1:8081/" + 'to-64', {
            method: 'POST',
            body: this.image_srcs[this.index]
        }).then(resp => resp.text());
        this.cache_image.src = "data:image/png;base64," + resp2;
        return true;
    }

    /**
     * @param {CloudBoundary} path 
     */
    draw_path(path)
    {
        this.ctx.beginPath();
        if (path.length > 0)
        {
            this.ctx.moveTo(path.points[0][0], path.points[0][1]);
            for (let i = 1; i < path.length; ++i)
                this.ctx.lineTo(path.points[i][0], path.points[i][1]);

            this.ctx.stroke();
            if (path == this.focused_on)
                this.ctx.fill();
            this.ctx.fillStyle = '#000000';
            for (let i = 0; i < path.length; ++i)
            {
                this.ctx.beginPath();
                this.ctx.arc(path.points[i][0], path.points[i][1], 1.5 / this.transform[0], 0, 2 * Math.PI);
                this.ctx.fill();
            }
            
            this.ctx.fillStyle = '#ff000080';
        }
    }

    /**
     * main draw loop
     */
    draw() {
        this.canvas.width = window.innerWidth; //a 1920 x 1080 effectively has 1280 x 720px on a 1.5 pixel ratio
        this.canvas.height = window.innerHeight;
        const x = (this.mouse_x - this.transform[4]) / this.transform[0];
        const y = (this.mouse_y - this.transform[5]) / this.transform[3];
        this.focused_on = null;
        for (const path of this.paths)
            if (path.contains(x, y)) this.focused_on = path;
        this.ctx.setTransform(...this.transform);
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        //this.ctx.fillStyle = '#000000';
        //this.ctx.fillRect(1180,620,100,100);
        if (this.image_loaded) {
            this.ctx.drawImage(this.cache_canvas, 0, 0);
            this.ctx.strokeStyle = '#000000';
            this.ctx.fillStyle = '#ff000080';
            this.ctx.lineWidth = 1 / this.transform[0];
            this.ctx.lineCap = this.ctx.lineJoin = 'round';
            for (const path of this.paths)
                this.draw_path(path);

            this.draw_path(this.curr_path);

            if (this.focused_on !== null)
            {
                this.ctx.translate(this.focused_on.center_x, this.focused_on.center_y);
                this.ctx.scale(1 / this.transform[0], 1 / this.transform[3]);
                this.ctx.font = '15px sans-serif';
                this.ctx.lineWidth = 3;
                const width = this.ctx.measureText("999.9,999.9").width + 20;
                const height = (this.focused_on.length - 1) * 20 + 20;
                this.ctx.fillStyle = '#000000c0';
                this.ctx.fillRect(-width / 2, -height, width, height);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                for (let a = 0; a < this.focused_on.length - 1; ++a)
                {
                    const pos = `${this.focused_on.points[a][0].toFixed(1)},${this.focused_on.points[a][1].toFixed(1)}`;
                    this.ctx.strokeText(pos, 0, 10 + 20 * a - height);
                    this.ctx.fillText(pos, 0, 10 + 20 * a - height);
                }

            }
        }
        else {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#000000';
            this.ctx.font = '50px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.lineWidth = 10;
            const repeat = ".".repeat(((Date.now() / 1000) | 0) % 3);
            this.ctx.strokeText("Loading."+repeat, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText("Loading."+repeat, this.canvas.width / 2, this.canvas.height / 2);
        }
    }
}

const test = new ImageHandler;

(async function () {
    await test.request_date("2 08 2018");
    await test.request_image();
})();

(function raf() {
    test.draw();
    requestAnimationFrame(raf);
})();
