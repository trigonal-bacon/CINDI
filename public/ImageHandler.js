import { Input } from "./Input.js";
import { CloudBoundary, is_in_path } from "./CloudBoundary.js";

export const ImageRenderer = class {
    scale = 1;
    shift_x = 0;
    shift_y = 0;
    cache_canvas = new OffscreenCanvas(1,1);

    cache_image = new Image();
    image_loaded = false;
    index = 0;
    date = "00 00 0000";
    usingV4_10 = false;
    date_valid = false;
    block_input = false;
    paths = [];
    curr_path = new CloudBoundary;
    warning_message = 0;
    submitted = false;
    constructor() {
        this.input = new Input;
        this.cache_image.onload = () => {
            this.image_loaded = true;
            this.cache_canvas.width = this.cache_image.width - 212;
            this.cache_canvas.height = 533;
            this.cache_canvas.getContext('2d').drawImage(this.cache_image, -82, -60);
        }
    }
    async request_date(date) {
        this.date_valid = false;
        date = date.replaceAll('/', ' ');
        let [m, d, y] = date.split(" ").map(_=>parseInt(_));
        this.usingV4_10 = y < 2020 || (y === 2020 && m < 7);
        y = (y | 0).toString().padStart(4, "0");
        m = (m | 0).toString().padStart(2, "0");
        d = (d | 0).toString().padStart(2, "0");
        let resp = await fetch("http://127.0.0.1:8081/", {
            method: "POST",
            body: date,
        }).then((resp) => resp.text());
        try {
            console.log(resp);
            this.image_srcs = resp.split(',');
            if (this.image_srcs.length === 1)
                throw new Error('Image loading exception');
            this.image_srcs = this.image_srcs.map(val => [val,val,val,val]).flat();
            this.index = 0;
            this.date = date;
            this.request_image();
            this.date_valid = true;
        } catch (e) {
            console.log(e + " | Please try again");
            this.date = '01 01 0001';
            this.date_valid = false;
        }
    }
    async request_image()
    {
        let [m, d, y] = this.date.split(" ").map(_=>parseInt(_));
        y = (y | 0).toString().padStart(4, "0");
        m = (m | 0).toString().padStart(2, "0");
        d = (d | 0).toString().padStart(2, "0");
        let src = this.image_srcs[this.index];
        if (this.usingV4_10)
            src = `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-10/${y}-${m}-${d}/${y}-${m}-${d}_${src}_V4.10_${(this.index & 3) + 1}`;
        else
            src = `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-11/${y}-${m}-${d}/${y}-${m}-${d}_${src}_V4.11_${(this.index & 3) + 1}`;
        this.scale = 1;
        this.shift_x = this.shift_y = 0;
        this.image_loaded = false;
        let resp2 = await fetch("http://127.0.0.1:8081/" + 'to-64', {
            method: 'POST',
            body: src + "_1_cloudsat_rr.png"
        }).then(resp => resp.text());
        if (resp2.length < 300)
            resp2 = await fetch("http://127.0.0.1:8081/" + 'to-64', {
                method: 'POST',
                body: src + "_1.png"
            }).then(resp => resp.text());
        this.cache_image.src = "data:image/png;base64," + resp2;
        this.curr_path = new CloudBoundary;
        this.paths = [];
        this.warning_message = 0;
        this.submitted = false;
        return true;
    }

    get width() { return this.cache_canvas.width; }
    get height() { return this.cache_canvas.height; }
    get x() { return window.innerWidth / 2; }
    get y() { return window.innerHeight / 2; }
    render_image(ctx) {
        ctx.setTransform(1,0,0,1,ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.fillStyle = '#22222240';
        ctx.fillRect(-ctx.canvas.width / 2, -ctx.canvas.height / 2, ctx.canvas.width, ctx.canvas.height);
        if (this.image_loaded) {
            ctx.save();
            ctx.translate(this.shift_x, this.shift_y);
            ctx.scale(this.scale, this.scale);
            ctx.drawImage(this.cache_canvas, -this.cache_canvas.width / 2, -this.cache_canvas.height / 2);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3 / this.scale;
            for (const path of this.paths)
            {
                ctx.beginPath();
                for (let n = 0; n < path.length; ++n)
                    ctx.lineTo(path[n][0], path[n][1]);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.beginPath();
            for (let n = 0; n < this.curr_path.length; ++n)
                ctx.lineTo(this.curr_path[n][0], this.curr_path[n][1]); 
            if (this.curr_path.closed)
                ctx.closePath();
            else if (this.warning_message === 0) {
                const x = (this.input.mouse.x - this.shift_x) / this.scale,
                y = (this.input.mouse.y - this.shift_y) / this.scale;
                if (this.curr_path.length > 3 && Math.hypot(this.curr_path[0][0] - x, this.curr_path[0][1] - y) < 10 / this.scale)
                    ctx.lineTo(this.curr_path[0][0], this.curr_path[0][1]) 
                else   
                    ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
            if (this.warning_message !== 0) {
                ctx.fillStyle = '#00000080';
                ctx.fillRect(-ctx.canvas.width / 2, -ctx.canvas.height / 2, ctx.canvas.width, ctx.canvas.height);
                ctx.fillStyle = '#ffffff';
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText("Are you sure? You still have an unfinished path", 0, -15);
                ctx.fillText("Click on the image to continue working", 0, 15);
                if (this.input.mouse_down_this_tick & 1)
                {
                    this.block_input = true;
                    this.warning_message = 0;
                }
            }
            else 
            {
                if (!this.block_input)
                    this.handle_inputs();
                else if (this.input.mouse_up_this_tick & 1)
                    this.block_input = false;
                const x = (this.input.mouse.x - this.shift_x) / this.scale,
                y = (this.input.mouse.y - this.shift_y) / this.scale;
                let focus = null;
                for (const path of this.paths) {
                    if (is_in_path(path, x, y))
                        focus = path;
                }
                if (focus) {
                    focus.calcCenter();
                    ctx.translate(this.shift_x, this.shift_y);
                    ctx.scale(this.scale, this.scale);
                    ctx.font = `${24/this.scale}px ubuntu`;
                    ctx.fillStyle = '#00000080';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    let height = 50;
                    if (focus.score !== 'bad req' && focus.score > 0.6)
                        height = 100;
                    let width = 200;
                    height /= this.scale;
                    width /= this.scale;
                    ctx.translate(focus.center_x, focus.center_y - focus.height / 2 - height / 2 - 10 / this.scale)
                    ctx.beginPath();
                    ctx.fillRect(-width / 2, -height / 2 , width, height);
                    ctx.fillStyle = '#ffffff';
                    if (!focus.scored)
                    {
                        ctx.fillText("Not scored yet", 0, 0);
                    }
                    else if (focus.score !== 'bad req')
                    {
                        if (focus.score > 0.6)
                        {
                            ctx.translate(0, -25 / this.scale);
                        }
                        ctx.textAlign = 'left';
                        ctx.fillText("Score: " + (100 * focus.score).toFixed(1), -width / 2 + 10 / this.scale, 0);
                        if (focus.score > 0.7)
                        {
                            ctx.fillText(focus.message, -width / 2 + 10 / this.scale, 50 / this.scale);
                            ctx.translate(70 / this.scale, 0);
                            ctx.scale(1 / this.scale, 1 / this.scale);
                            draw_star(ctx);
                        }
                        else if (focus.score > 0.6)
                        {
                            ctx.fillText("Close!", -width / 2 + 10 / this.scale, 50 / this.scale);
                        }
                    }
                    else 
                        ctx.fillText("Could not score, please try again", focus.center_x, focus.center_y - focus.height / 2 - 5 / this.scale);
                }
            }
        }
        else {
            ctx.font = '48px ubuntu';
            ctx.fillStyle = '#444444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (this.date_valid)
                ctx.fillText("Image Loading...", 0, 0);
            else if (this.date === '00 00 0000') 
                ctx.fillText("No Date Selected", 0, 0);
            else
                ctx.fillText("No Images for Selected Date", 0, 0);
        }        
        this.input.reset();
    }
    handle_inputs() {
        if (this.input.right_click || this.input.left_click && this.input.dragging) {
            this.shift_x += (this.input.mouse.x - this.input.mouse_prev.x);
            this.shift_y += (this.input.mouse.y - this.input.mouse_prev.y);
        }
        if (this.input.wheel_delta !== 0) {
            const offset_x = this.input.mouse.x - this.shift_x,
            offset_y = this.input.mouse.y - this.shift_y;
            const before_scale = this.scale;
            if (this.input.wheel_delta > 0) {
                this.scale *= 1.25;
            }
            else {
                this.scale *= 0.8;
            }
            this.shift_x += (before_scale - this.scale) / before_scale * offset_x;
            this.shift_y += (before_scale - this.scale) / before_scale * offset_y;
        }
        else if (this.input.mouse_up_this_tick & 1 && this.input.dragging === false) {
            const x = (this.input.mouse.x - this.shift_x) / this.scale,
            y = (this.input.mouse.y - this.shift_y) / this.scale;
            if (Math.abs(x) > this.cache_canvas.width / 2 || Math.abs(y) > this.cache_canvas.height / 2)
                return;
            if (this.curr_path.length > 3 && Math.hypot(this.curr_path[0][0] - x, this.curr_path[0][1] - y) < 10 / this.scale)
            {
                this.curr_path.closed = true;
                this.paths.push(this.curr_path);
                this.curr_path = new CloudBoundary;
            }
            else if (this.curr_path.length === 0 || Math.hypot(this.curr_path[this.curr_path.length - 1][0] - x, this.curr_path[this.curr_path.length - 1][1] - y) > 5 / this.scale)
                this.curr_path.push([x, y, performance.now()]);
        }
    }
}

function draw_star(ctx) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#ffff00";
    ctx.strokeStyle = "#cfcf00";
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let n = 0; n < 10; ++n)
    {
        const radius = (n % 2 ? 16 : 8);
        ctx.lineTo(radius * Math.cos(0.2 * n * Math.PI), radius * Math.sin(0.2 * n * Math.PI));
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
}