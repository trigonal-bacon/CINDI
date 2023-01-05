class Window {
    static canvas = document.getElementById('canvas');
    static ctx = Window.canvas.getContext('2d');
    static scale = window.devicePixelRatio;
    static mouseX = 0;
    static mouseY = 0;
    static clickState = -1;
    static elems = {};
    static resizeCanvas() {
        Window.canvas.width = Window.scale * window.innerWidth;
        Window.canvas.height = Window.scale * window.innerHeight;
    }
    static refresh() {
        Window.resizeCanvas();
        for (const elem of Object.values(Window.elems)) {
            elem.draw();
        }
        requestAnimationFrame(Window.refresh);
    }
    /*
    elem:
    id: {
        pos {x, y, w, h},
        onmouseover,
        onmousedown,
        onmouseup
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
        this.width = w / 1920;
        this.height = h / 1080;
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
            border_width() {
                return Math.max(this.width, this.height) * 100;
            },
            border_radius() {
                return Math.max(this.width, this.height) * 100;
            },
            innerText: "this is text",
            font: "Ubuntu",
            text_color: "#ffffff",
            text_border_color: "#aaaaaa",
            text_size() {
                return Math.max(this.width, this.height) * 0.2; 
            }
        }, options); 
        console.log(this.options);
        Window.elems[id] = this;       
    }
    draw() {
        Window.ctx.fillStyle = this.options.color;
        Window.ctx.setTransform(Window.canvas.width,0,0,Window.canvas.height,0,0);
        Window.ctx.beginPath();
        Window.ctx.rect(this.x-this.width/2,this.y-this.height/2,this.width,this.height);
        Window.ctx.fill();
        if (this.options.border) {
            Window.ctx.setTransform(1,0,0,1,0,0);
            Window.ctx.strokeStyle = this.options.border_color;
            Window.ctx.lineJoin = 'round';
            Window.ctx.lineWidth = this.options.border_width.apply(this);
            Window.ctx.stroke();
        }
        if (this.options.innerText) {
            Window.ctx.fillStyle = this.options.text_color;
            Window.ctx.strokeStyle = this.options.text_border_color;
            Window.ctx.textAlign = 'center';
            Window.ctx.lineWidth = this.options.text_size.apply(this) * Window.canvas.width * 0.2 | 0;
            Window.ctx.font = `${this.options.text_size.apply(this) * Window.canvas.width | 0}px ${this.options.font}`;
            Window.ctx.setTransform(1,0,0,1,0,0);
            Window.ctx.strokeText(this.options.innerText, this.x * Window.canvas.width, this.y * Window.canvas.height);
            Window.ctx.fillText(this.options.innerText, this.x * Window.canvas.width, this.y * Window.canvas.height);
        }
    }
}
class TextInput extends Element {
    constructor(id, x, y, w, h, onmouseover, onmousedown, onmouseup, onenter, options) {
        super(id, x, y, w, h, options);
    }
}
class ImageHolder extends Element {
    constructor(id, image, x, y) {
        super(id, x, y, image.width, image.height);
        this.image = image;
        this.ratio = image.x / image.y;
    }
    set(src) {
        this.image.src = src;
    }
    draw() {
        Window.ctx.setTransform(0.6,0,0,0.6,300,50);
        Window.ctx.drawImage(this.image, 0, 0);
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
        this.draw();
    }
    draw() {
        if (Math.abs(Window.mouseX / Window.canvas.width - this.x) < this.width / 2
        && Math.abs(Window.mouseY / Window.canvas.height - this.y) < this.height / 2) {
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
    constructor(id, image, x, y, onmouseover, onmousedown, onmouseup) {
        super(id, image, x, y);
        this.imageSrcList = [];
        this.pos = 0;
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
        new Button('13',150,300,200,100,
        function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
        function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00" },
        function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000";
        that.pos++; Window.elems["1"].set(that.imageSrcList[(that.pos + 400) % 400]);
        this.options.innerText = `NEXT: ${that.pos}/${that.imageSrcList.length}`
        },
        {innerText: "NEXT: 0/400"});
        new Button('14',150,500,200,100,
        function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
        function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00" },
        function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000";
        that.pos--; Window.elems["1"].set(that.imageSrcList[(that.pos + 400) % 400]) },
        {innerText: "PREV"});
        this.set(this.imageSrcList[0]);
      } catch (err) {
        console.log("ERR:AN ERROR OCCURED", err);
        console.log(resp);
      }
    }
  }
/*
might use requestAnimationFrame, or event emitters

need to anticipate resize, resizes EVERYTHING
*/
const handle = new ImageHandler("1", new Image(), 200, 200);
window.test = new Window();
new Button('10',150,100,200,100, 
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" },
function() { this.options.color = '#00ff00'; this.options.border_color = "#00aa00"; handle.fetch("1/1/2018") },
function() { this.options.color = '#ff0000'; this.options.border_color = "#aa0000" });
/*
[NEED] requestAnimationFrame loop
create DOM models
*/
requestAnimationFrame(Window.refresh);