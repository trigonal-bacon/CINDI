class Window {
    static canvas = document.getElementById('canvas');
    static ctx = Window.canvas.getContext('2d');
    static mouseX = 0;
    static mouseY = 0;
    static clickState = -1;
    static elems = {};
    static resizeCanvas() {
        Window.canvas.width = devicePixelRatio * window.innerWidth;
        Window.canvas.height = devicePixelRatio * window.innerHeight;
    }
    static refresh() {
        Window.resizeCanvas();
        for (const elem of Object.values(Window.elems)) {
            if (elem.show) elem.draw();
        }
        requestAnimationFrame(Window.refresh);
    }
    static get scale() {
        return Math.min(Window.canvas.width / 1920, Window.canvas.height / 1080) / devicePixelRatio;
    }
    /*
    elem:
    id: {
        pos {x, y, w, h},
        onmouseover?,
        onmousedown?,
        onmouseup?,
        etc...
    }
    */
    constructor() {
        Window.resizeCanvas();
        this.layout = [];
        /*
        might use this for resize
        */
        Window.canvas.onmousemove = async ({clientX, clientY}) => {
            Window.mouseX = clientX;
            Window.mouseY = clientY;
            //Window.refresh();
        }
        Window.canvas.onmousedown = async ({clientX, clientY, button}) => {
            Window.mouseX = clientX;
            Window.mouseY = clientY;
            Window.clickState = button;
            //Window.refresh();
        }
        Window.canvas.onmouseup = async ({clientX, clientY}) => {
            Window.mouseX = clientX;
            Window.mouseY = clientY;
            Window.clickState = -1;
            //Window.refresh();
        }
    }
}
class Element {
    constructor(id, x, y, w, h, options) {
        this.x = x / 1920;
        this.y = y / 1080;
        this.width = w;
        this.height = h;
        /*
        options: {
            color,
            border_color,
            border_width,
            border_radius,
            innerText
        }
        */
        this.options = Object.assign({
            color: '#000000',
            border: true,
            border_color: '#303030',
            border_width: 10,
            border_radius: 10,
            innerText: "this is text",
            font: "Ubuntu",
            text_color: "#ffffff",
            text_border_color: "#aaaaaa",
            text_size: 40
        }, options); 
        this.show = true;
        Window.elems[id] = this;       
    }
    draw() {
        Window.ctx.fillStyle = this.options.color;
        Window.ctx.setTransform(Window.scale,0,0,Window.scale,this.x*window.innerWidth,this.y*window.innerHeight)
        Window.ctx.beginPath();
        Window.ctx.rect(-this.width/2,-this.height/2,this.width,this.height);
        Window.ctx.fill();
        if (this.options.border) {
            Window.ctx.strokeStyle = this.options.border_color;
            Window.ctx.lineJoin = 'round';
            Window.ctx.lineWidth = this.options.border_width;
            Window.ctx.stroke();
        }
        if (this.options.innerText) {
            Window.ctx.fillStyle = this.options.text_color;
            Window.ctx.strokeStyle = this.options.text_border_color;
            Window.ctx.textAlign = 'center';
            //Window.ctx.lineWidth = this.options.text_size * 0.2;
            Window.ctx.font = `${this.options.text_size | 0}px sans-serif`;
            //Window.ctx.strokeText(this.options.innerText, this.x, this.y);
            Window.ctx.fillText(this.options.innerText, this.x, this.y);
        }
    }
}
class ProportionScaledElement extends Element {
    constructor(id, x, y, w, h, options) {
        super(id, x ,y, w / 1920, h / 1080, options); //this uses % as a base
    }
    draw() {
        Window.ctx.fillStyle = '#00000080';
        Window.ctx.setTransform(Window.canvas.width / devicePixelRatio,0,0,Window.canvas.height / devicePixelRatio,0,0);
        Window.ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
class TextInput extends Element {
    constructor(id, x, y, w, h, onmouseover, onmousedown, onmouseup, onenter, options) {
        super(id, x, y, w, h, options);
    }
}
class ImageHolder extends Element {
    constructor(id, image, x, y) {
        super(id, x, y, 0, 0);
        this.image = image;
        this.ready = -1;
        this.image.onload = _ => {
            this.width = image.width;
            this.height = image.height;
            this.ready = 1;
        }
    }
    set(src) {
        this.ready = 0;
        this.image.src = src;
        this.ratio = this.image.width / this.image.height;
    }
    draw() {
        Window.ctx.setTransform(Window.scale,0,0,Window.scale,this.x*window.innerWidth,this.y*window.innerHeight);
        Window.ctx.drawImage(this.image, -this.image.width/2,-this.image.height/2);
    }
}
class Button extends Element {
    constructor(id, x, y, w, h, onmouseover, onmousedown, onmouseup, options) {
        /*
        I am creating the layout in 1920x1080, this may cause problems
        */
        super(id, x, y, w, h, options);
        this.onmouseover = onmouseover ?? function(){};
        this.onmousedown = onmousedown ?? function(){};
        this.onmouseup = onmouseup ?? function(){};
        this.prevClickState = -1;
        this.default = {...this.options};
    }
    draw() {
        if (Math.abs(Window.mouseX - this.x * window.innerWidth) < this.width / 2 * Window.scale
        && Math.abs(Window.mouseY - this.y * window.innerHeight) < this.height / 2 * Window.scale) {
            if (Window.clickState === 0) this.onmousedown.apply(this);
            else if (this.prevClickState === 0) {
                this.prevClickState = Window.clickState;
                this.onmouseup.apply(this);
            }
            else this.onmouseover.apply(this);
        } else {
            this.options = {...this.default};
        }
        this.prevClickState = Window.clickState;
        super.draw();
    }
}
class ImageHandler extends ImageHolder {
    constructor(id, image, x, y) {
        super(id, image, x, y);
        this.imageSrcList = [];
        this.pos = 0;
        this.mult = 1;
        this.loadingTick = 0;
        this.prevClickState = -1;
    }
    draw() {
        if (Math.abs(Window.mouseX - this.x * window.innerWidth) < this.width / 2 * Window.scale
        && Math.abs(Window.mouseY - this.y * window.innerHeight) < this.height / 2 * Window.scale) {
            if (Window.clickState === 0) this.mult = 1.1;
            else if (this.prevClickState === 0) {
                this.mult = 1;
                //do onclick stuff!
                this.show = false;
                Window.elems["2"].show = true;
                Window.elems["2"].set(this.image.src);
                Window.elems["13"].show = Window.elems["14"].show = false;
            }
            else this.mult = 1.05;
        } else this.mult = 1;
        Window.ctx.setTransform(Window.scale*this.mult,0,0,Window.scale*this.mult,this.x*window.innerWidth,this.y*window.innerHeight);
        if (this.ready === 1) {
            this.loadingTick = 0;
            Window.ctx.drawImage(this.image, -this.image.width/2,-this.image.height/2);
        }
        else if (this.ready === 0) {
            this.loadingTick += 0.04;
            Window.ctx.font = `${200 * Window.scale | 0}px sans-serif`;
            Window.ctx.textAlign = 'center';
            Window.ctx.fillText("LOADING"+".".repeat((this.loadingTick | 0) % 3 + 1),0,0)
        }
        this.prevClickState = Window.clickState;
    }
    async fetch(date) {
        date = date.replaceAll('/',' ');
        let resp = await fetch(location.href.split("browseUI")[0], {
            method: "POST",
            body: date.toString(),
        }).then((resp) => resp.text());
        try {
            const that = this;
            this.imageSrcList = JSON.parse(resp);
            this.pos = 0;
            new Button('13',1820,660,140,100,
            function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
            function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00" },
            function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000";
            that.pos++; that.set(that.imageSrcList[(that.pos + 400) % 400]);
            },
            {innerText: "NEXT"});
            new Button('14',400,660,140,100,
            function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
            function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00" },
            function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000";
            that.pos--; that.set(that.imageSrcList[(that.pos + 400) % 400]) },
            {innerText: "PREV"});
            this.set(this.imageSrcList[0]);
        } catch (err) {
            console.log("ERR:AN ERROR OCCURED", err);
            console.log(resp);
        }
    }
}
class ImageHandler2 extends ImageHolder {
    constructor(id, image, x, y) {
        super(id, image, x, y);
        this.prevClickState = -1;
        this.hoverX = 0;
        this.hoverY = 0;
        this.imageCanvas = new OffscreenCanvas(1920,1080);
        this.imageCtx = this.imageCanvas.getContext('2d');
        this.image.onload = this.imageCanvas.clear = _ => {
            this.width = 1089;
            this.height = 540;
            console.log(this.width, this.height);
            this.imageCtx.clearRect(0,0,1920,1080);
            this.imageCtx.drawImage(this.image, 81, 60,
                1089, 540, 0, 0, 1089, 540);
            this.ready = 1;
        }
    }
    draw() {
        if (Math.abs(Window.mouseX - this.x * window.innerWidth) < this.width / 2 * Window.scale
        && Math.abs(Window.mouseY - this.y * window.innerHeight) < this.height / 2 * Window.scale) {
            if (this.prevClickState === 0) {
                //do onclick stuff!
                const cX = this.x * window.innerWidth - this.width / 2 * Window.scale,
                cY = this.y * window.innerHeight - this.height / 2 * Window.scale;
                this.hoverX = (Window.mouseX - cX) / Window.scale;
                this.hoverY = (Window.mouseY - cY) / Window.scale;
            }
            else {
                //hover stuff
                const cX = this.x * window.innerWidth - this.width / 2 * Window.scale,
                cY = this.y * window.innerHeight - this.height / 2 * Window.scale;
                this.hoverX = (Window.mouseX - cX) / Window.scale;
                this.hoverY = (Window.mouseY - cY) / Window.scale;
            }
        } else this.mult = 1;
        Window.ctx.setTransform(Window.scale,0,0,Window.scale,this.x*window.innerWidth,this.y*window.innerHeight);
        if (this.ready === 1) {
            this.loadingTick = 0;
            Window.ctx.drawImage(this.imageCanvas, -this.width/2,-this.height/2);
            Window.ctx.drawImage(this.imageCanvas, this.hoverX-50,this.hoverY-50,100,100,-this.width/2 - 450, -150,300,300);
            Window.ctx.strokeStyle = '#000000';
            Window.ctx.lineWidth = 7;
            Window.ctx.beginPath();
            Window.ctx.arc(-this.width/2 - 300, 0, 10, 0, 2 * Math.PI);
            Window.ctx.stroke();
        }
        else if (this.ready === 0) {
            this.loadingTick += 0.04;
            Window.ctx.font = `${200 * Window.scale | 0}px sans-serif`;
            Window.ctx.textAlign = 'center';
            Window.ctx.fillText("LOADING"+".".repeat((this.loadingTick | 0) % 3 + 1),0,0)
        }
        this.prevClickState = Window.clickState;        
    }
}
/*
might use requestAnimationFrame, or event emitters

need to anticipate resize, resizes EVERYTHING
*/
const handle = new ImageHandler('1', new Image(), 1110, 660);
new ImageHandler2('2', new Image(), 1300, 660).show = false;
new Button('13',1820,660,140,100,
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00" },
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000";
},
{innerText: "NEXT"}).show = false;
new Button('14',400,660,140,100,
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00" },
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000";
},
{innerText: "PREV"}).show = false;
window.test = new Window();
new Button('10',150,100,300,100, 
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00"; handle.fetch("1/1/2018");
Window.elems["13"].show = Window.elems["14"].show = handle.show = true;
Window.elems["2"].show = false;
},
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
{innerText: "LOAD IMAGES"});
new ProportionScaledElement('7',0,0,300,1080);
new ProportionScaledElement('8',300,0,1620,200);
/*
[DONE] requestAnimationFrame loop
[NEED] better resizing algorithm
[NEED] create DOM models
[WANT] text box element
*/
requestAnimationFrame(Window.refresh);