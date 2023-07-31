'use strict';

/** DESC[] */
class CloudBoundary {
    /** @public */
    points = []; // [x, y, time] array
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
    calcCenter() {
        if (this.length === 0)
            return;
        const len = (this.length > 1 && (this.points[0][0] === this.points[this.length - 1][0] && this.points[this.length - 1][1])) ? this.length - 1 : this.length;
        let x = 0, y = 0;
        for (let n = 0; n < len; ++n)
        {
            x += this.points[n][0];
            y += this.points[n][1];
        }
        this.center_x = x / len;
        this.center_y = y / len;
    }
    add(x, y) { 
        if (this.length === 0 || x !== this.points[this.length - 1][0] && y !== this.points[this.length - 1][1])
        {
            this.points.push([x, y, performance.now()]);
            this.calcCenter();
        }
    }
    pop() {
        this.points.pop(); 
        this.calcCenter();
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
    index = 42;
    image_loaded = false;
    cache_image = new Image();
    cache_canvas = new OffscreenCanvas(1,1); //almost all images are this size
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    image_srcs = [];
    
    paths = [];
    curr_path = new CloudBoundary;
    right_click = false;
    left_click = false;
    rc_this_tick = false;
    lc_this_tick = false;
    last_clicked = performance.now();
    mouse_x = 0;
    mouse_y = 0;
    //position of last mousedown
    click_mouse_x = 0;
    click_mouse_y = 0;
    dragging = false;
    transform = new Float64Array([0.75,0,0]); //scale, x, y
    focused_on = null; // path that is hovered over
    buttons = [new Button(-500, 0, 0), new Button(500, 0, 1)];
    
    constructor() {
        this.cache_image.onload = () => {
            this.image_loaded = true;
            this.cache_canvas.width = this.cache_image.width - 212;
            this.cache_canvas.height = 533;
            this.cache_canvas.getContext('2d').drawImage(this.cache_image, -82, -60);
        }
        
        this.canvas.addEventListener("mousemove", (e) => {
            let x = e.clientX - this.canvas.width / 2, y = e.clientY - this.canvas.height / 2;
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
                if (Math.abs(x) < this.cache_canvas.width / 2 * 0.75 && Math.abs(y) < this.cache_canvas.height / 2 * 0.75)
                {
                    this.transform[1] += dx;
                    this.transform[2] += dy;
                }
            }
        });

        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button === 0)
                this.lc_this_tick = this.left_click = true;
            else if (e.button === 2)
                this.rc_this_tick = this.right_click = true;
            this.mouse_x = this.click_mouse_x = e.clientX - this.canvas.width / 2;
            this.mouse_y = this.click_mouse_y = e.clientY - this.canvas.height / 2;
            this.dragging = false;
            this.last_clicked = performance.now();
        });
        
        this.canvas.addEventListener("mouseup", (e) => {
            if (e.button === 0)
                this.left_click = false;
            else if (e.button === 2)
                this.right_click = false;
            
            if (e.button === 0 && (!this.dragging || performance.now() - this.last_clicked < 200)) {
                if (Math.abs(e.clientX - this.canvas.width / 2) < this.cache_canvas.width / 2 * 0.75 && Math.abs(e.clientY - this.canvas.height / 2) < this.cache_canvas.height / 2 * 0.75) {
                    let x = (e.clientX - this.transform[1] - this.canvas.width / 2) / this.transform[0], y = (e.clientY - this.transform[2] - this.canvas.height / 2) / this.transform[0];
                    if (this.curr_path.length > 2) {
                        let start_x = this.curr_path.points[0][0], start_y = this.curr_path.points[0][1];
                        if (Math.hypot(start_x - x, start_y - y) < 7.5 / this.transform[0]) {
                            x = start_x; y = start_y;
                            this.curr_path.add(x, y);
                            this.paths.push(this.curr_path.clone());
                            this.curr_path.reset();
                            return;
                        }
                    }
                    this.curr_path.add(x, y);
                }
            }
            this.dragging = false;
        });

        this.canvas.addEventListener("wheel", (e) => {
            const offset_x = this.mouse_x - this.transform[1],
            offset_y = this.mouse_y - this.transform[2];
            const before_scale = this.transform[0];
            if (e.deltaY > 0) {
                this.transform[0] *= 1.1;
            }
            else {
                this.transform[0] /= 1.1;
            }
            this.transform[1] += (before_scale - this.transform[0]) / before_scale * offset_x;
            this.transform[2] += (before_scale - this.transform[0]) / before_scale * offset_y;
        });

        document.addEventListener("keyup", (e) => {
            if (e.code === 'Minus' || e.code === 'Equal')
            {
                const offset_x = this.mouse_x - this.transform[1],
                offset_y = this.mouse_y - this.transform[2];
                const before_scale = this.transform[0];
                if (e.code === 'Equal') {
                    this.transform[0] *= 1.1;
                }
                else {
                    this.transform[0] /= 1.1;
                }
                this.transform[1] += (before_scale - this.transform[0]) / before_scale * offset_x;
                this.transform[2] += (before_scale - this.transform[0]) / before_scale * offset_y;
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
        let [m, d, y] = date.split(" ").map(_=>parseInt(_));
        const usingV4_10 = y < 2020 || (y === 2020 && m < 7);
        y = (y | 0).toString().padStart(4, "0");
        m = (m | 0).toString().padStart(2, "0");
        d = (d | 0).toString().padStart(2, "0");
        let resp = await fetch("http://127.0.0.1:8081/", {
            method: "POST",
            body: date,
        }).then((resp) => resp.text());
        try {
            this.image_srcs = JSON.parse(resp);
            this.image_srcs = this.image_srcs.map(val => [val,val,val,val]).flat();
            if (usingV4_10)
                this.image_srcs = this.image_srcs.map(
                    (time, index) =>
                    `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-10/${y}-${m}-${d}/${y}-${m}-${d}_${time}_V4.10_${(index & 3) + 1}_1.png`
                );
            else
                this.image_srcs = this.image_srcs.map(
                    (time, index) =>
                    `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-11/${y}-${m}-${d}/${y}-${m}-${d}_${time}_V4.11_${(index & 3) + 1}_1.png`
                );
            console.log(resp);
            //this.index = 0;
            return true;
        } catch (e) {
            console.log(e + " | Please try again");
            //console.log(resp);
            return false;
        }
    }

    /**
     * @returns {boolean}
     */
    async request_image()
    {
        this.transform.set([0.75,0,0], 0);
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
        const x = (this.mouse_x - this.transform[1]) / this.transform[0];
        const y = (this.mouse_y - this.transform[2]) / this.transform[0];
        this.focused_on = null;
        for (const path of this.paths)
            if (path.contains(x, y)) this.focused_on = path;
        this.ctx.setTransform(1,0,0,1,this.canvas.width / 2, this.canvas.height / 2);

        this.ctx.save();
        this.ctx.fillStyle = '#00000020';
        this.ctx.beginPath();
        this.ctx.rect(-this.cache_canvas.width / 2 * 0.75, -this.cache_canvas.height / 2 * 0.75, this.cache_canvas.width * 0.75, this.cache_canvas.height * 0.75);
        this.ctx.fill();
        if (this.image_loaded) {
            this.ctx.clip();
            this.ctx.translate(this.transform[1],this.transform[2]);
            this.ctx.scale(this.transform[0],this.transform[0]);
            this.ctx.drawImage(this.cache_canvas, -this.cache_canvas.width / 2, -this.cache_canvas.height / 2);
            this.ctx.strokeStyle = '#aabb33';
            this.ctx.fillStyle = '#ff000080';
            this.ctx.lineWidth = 2 / this.transform[0];
            this.ctx.lineCap = this.ctx.lineJoin = 'round';
            for (const path of this.paths)
                this.draw_path(path);

            this.draw_path(this.curr_path);
            this.ctx.restore();
            this.ctx.save();

            if (this.focused_on !== null) {
                this.ctx.translate(this.transform[1],this.transform[2]);
                this.ctx.scale(this.transform[0],this.transform[0]);
                this.ctx.translate(this.focused_on.center_x, this.focused_on.center_y);
                this.ctx.scale(1 / this.transform[0], 1 / this.transform[0]);
                this.ctx.font = '15px sans-serif';
                this.ctx.lineWidth = 3;
                const width = this.ctx.measureText("concavity_score: 9.999").width + 20;
                const height = (5) * 20 + 20;
                this.ctx.fillStyle = '#000000c0';
                this.ctx.fillRect(-width / 2, -height, width, height);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                const score = this.score(this.focused_on);
                const keys = Object.keys(score);
                for (let a = 0; a < keys.length; ++a)
                {
                    this.ctx.strokeText(`${keys[a]}: ${score[keys[a]].toFixed(3)}`, 0, 10 + 20 * a - height);
                    this.ctx.fillText(`${keys[a]}: ${score[keys[a]].toFixed(3)}`, 0, 10 + 20 * a - height);
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
            this.ctx.strokeText("Loading."+repeat, 0, 0);
            this.ctx.fillText("Loading."+repeat, 0, 0);
        }
        this.ctx.restore();
        for (const button of this.buttons)
            button.draw(this.ctx);
        for (const button of this.buttons) {
            if (this.lc_this_tick)
                if (Math.abs(this.mouse_x - button.x) < button.width / 2 && Math.abs(this.mouse_y - button.y) < button.height / 2) 
                    switch(button.type){
                        case 0:
                            if (this.index === 0)
                                this.index = this.image_srcs.length - 1;
                            else
                                --this.index;
                            this.request_image();
                            break;
                        case 1:
                            if (this.index === this.image_srcs.length - 1)
                                this.index = 0;
                            else
                                ++this.index;
                            this.request_image();
                    }
        }
        this.lc_this_tick = this.rc_this_tick = false;
    }

    score(path) {
        if (path.points.length < 3)
            return 0;
        const len = path.length;
        const startTime = path.points[0][2],
        endTime = path.points[len - 1][2];
        const time_score = Math.min((endTime - startTime) / (750 * len), 1); //each point should take at least 750 ms to place
        let concavity_score = 1.1;
        let area = 0;
        for (let i = 0; i < len - 2; ++i) {
            area += 0.5 * (path.points[i][0] - path.points[i + 1][0]) * (path.points[i][1] + path.points[i + 1][1]);
        }
        area += 0.5 * (path.points[len - 2][0] - path.points[0][0]) * (path.points[len - 2][1] + path.points[0][1]);
        const area_score = Math.abs(area) < 400 ? area * area / (400 * 400) : Math.abs(area) > 900 ? Math.max(1 - (Math.abs(area) - 900) / 300, 0) : 1;
        let min_x = path.points[0][0], min_y = path.points[0][1], max_x = path.points[0][0], max_y = path.points[0][1];
        for (let i = 0; i < len - 1; ++i) {
            const p1 = path.points[(i - 1 + len - 1) % (len - 1)],
            p2 = path.points[i],
            p3 = path.points[(i + 1) % (len - 1)];
            if (p2[0] > max_x)
                max_x = p2[0];
            else if (p2[0] < min_x)
                min_x = p2[0];
            if (p2[1] > max_y)
                max_y = p2[1];
            else if (p2[1] < min_y)
                min_y = p2[1];
                
            const v1 = [p1[0] - p2[0], p1[1] - p2[1]],
            v2 = [p3[0] - p2[0], p3[1] - p2[1]];
            let cos = (v1[0] * v2[0] + v1[1] * v2[1]) / Math.sqrt((v1[0]*v1[0]+v1[1]*v1[1])*(v2[0]*v2[0]+v2[1]*v2[1]));
            let sin = (-v1[0] * v2[1] + v1[1] * v2[0]) / Math.sqrt((v1[0]*v1[0]+v1[1]*v1[1])*(v2[0]*v2[0]+v2[1]*v2[1]));
            cos = Math.acos(cos);
            if (Math.sign(sin) !== Math.sign(area))
                concavity_score -= (Math.PI - cos) / (len - 1);
        }
        const shape_score = Math.max(Math.min(((max_x - min_x) / (max_y - min_y) - 5) / 3, 1), 0);
        concavity_score = Math.min(concavity_score, 1);
        return { score: time_score * 0.3 + area_score * 0.3 + concavity_score * 0.1 + shape_score * 0.3, concavity_score, area_score, time_score, shape_score };
    }
}

const test = new ImageHandler;

(async function () {
    await test.request_date("2 12 2019");
    test.request_image();
})();

(function raf() {
    test.draw();
    requestAnimationFrame(raf);
})();
