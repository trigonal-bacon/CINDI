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
        /*
        {
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
        }
       */
        this.options = Object.assign({
            color: '#000000',
            border: false,
            border_color: '#303030',
            border_width: 0,
            border_radius: 0,
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
        if (this.options.border_radius) Window.ctx.roundRect(-this.width/2,-this.height/2,this.width,this.height,this.options.border_radius);
        else Window.ctx.rect(-this.width/2,-this.height/2,this.width,this.height);
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
            Window.ctx.fillText(this.options.innerText, this.x, this.y + this.options.text_size / 3);
        }
    }
}
class ProportionScaledElement extends Element {
    constructor(id, x, y, w, h, options) {
        super(id, x ,y, w / 1920, h / 1080, options); //this uses % as a base
    }
    draw() {
        Window.ctx.fillStyle = this.options.color;
        Window.ctx.setTransform(Window.canvas.width / devicePixelRatio,0,0,Window.canvas.height / devicePixelRatio,0,0);
        Window.ctx.beginPath();
        if (this.options.border_radius) Window.ctx.roundRect(this.x, this.y, this.width, this.height, this.options.border_radius);
        else Window.ctx.rect(this.x, this.y, this.width, this.height);
        Window.ctx.fill();
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
            Window.ctx.fillText("LOADING"+".".repeat((this.loadingTick|0)%3+1),0,0)
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
/*
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
*/
/*
[DONE] requestAnimationFrame loop
[NEED] better resizing algorithm
[NEED] create DOM models
[WANT] text box element
*/
new ProportionScaledElement('1',0,0,1920,1080,{color: '#d0d0d0'})
new ProportionScaledElement('2',0,60,1920,180,{color: '#333333a0'})
new Element('3',240,150,320,100,{color: '#999999b0',border_radius:10, innerText: "Introduction"});
new Element('4',640,150,320,100,{color: '#999999b0',border_radius:10, innerText: "Timeline"});
new Element('5',1040,150,320,100,{color: '#999999b0',border_radius:10, innerText: "Tab 2"});
new Element('6',1440,150,320,100,{color: '#999999b0',border_radius:10, innerText: "Tab 3"});

/* PAGE TIMELINE
new Element('7',200,350,300,100,{color: '#d0d0d0',border_radius:10, innerText: "Timeline", text_size:75, text_color: '#000000'});
new Element('8',960,600,1800,15,{color: '#555555',border_radius:10, innerText: ''});

new Element('9',200,630,15,60,{color: '#555555',border_radius:10, innerText: ''});
new Element('10',200,800,350,250,{color: '#a0a0a0',border_radius:10, innerText: ''});
new Element('11',200,725,200,200,{color: '#d0d0d000',border_radius:10, innerText: '1910', text_size: 50});
new Element('12',200,775,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'James Bryan Herrick', text_size: 25});
new Element('13',200,810,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'discovers sickle cell', text_size: 25});
new Element('14',200,845,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'disease upon examination', text_size: 25});
new Element('15',200,880,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'of a dental student.', text_size: 25});

new Element('16',600,570,15,60,{color: '#555555',border_radius:10, innerText: ''});
new Element('17',600,425,350,200,{color: '#a0a0a0',border_radius:10, innerText: ''});
new Element('18',600,365,200,200,{color: '#d0d0d000',border_radius:10, innerText: '1949', text_size: 50});
new Element('19',600,415,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'SCD is declared as the', text_size: 25});
new Element('20',600,450,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'first documented molecular', text_size: 25});
new Element('21',600,485,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'disease.', text_size: 25});

new Element('22',850,630,15,60,{color: '#555555',border_radius:10, innerText: ''});
new Element('23',850,765,350,180,{color: '#a0a0a0',border_radius:10, innerText: ''});
new Element('24',850,725,200,200,{color: '#d0d0d000',border_radius:10, innerText: '1957', text_size: 50});
new Element('25',850,775,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'The exact mutation that', text_size: 25});
new Element('26',850,810,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'causes SCD is identified.', text_size: 25});

new Element('27',1000,570,15,60,{color: '#555555',border_radius:10, innerText: ''});
new Element('28',1000,425,350,200,{color: '#a0a0a0',border_radius:10, innerText: ''});
new Element('29',1000,365,200,200,{color: '#d0d0d000',border_radius:10, innerText: '1960', text_size: 50});
new Element('30',1000,415,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'Blood transfusion are used', text_size: 25});
new Element('31',1000,450,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'as the first proven treatment', text_size: 25});
new Element('32',1000,485,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'for SCD.', text_size: 25});

new Element('33',1250,630,15,60,{color: '#555555',border_radius:10, innerText: ''});
new Element('34',1250,785,350,220,{color: '#a0a0a0',border_radius:10, innerText: ''});
new Element('35',1250,725,200,200,{color: '#d0d0d000',border_radius:10, innerText: '1984', text_size: 50});
new Element('36',1250,775,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'Bone marrow transplants are', text_size: 25});
new Element('37',1250,810,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'introduced as a potential cure', text_size: 25});
new Element('38',1250,845,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'for SCD.', text_size: 25});

new Element('39',1400,570,15,60,{color: '#555555',border_radius:10, innerText: ''});
new Element('40',1400,425,350,200,{color: '#a0a0a0',border_radius:10, innerText: ''});
new Element('41',1400,365,200,200,{color: '#d0d0d000',border_radius:10, innerText: '1998', text_size: 50});
new Element('42',1400,415,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'Hydroxyurea is approved by', text_size: 25});
new Element('43',1400,450,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'the FDA as the first drug', text_size: 25});
new Element('44',1400,485,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'treatment for SCD.', text_size: 25});

new Element('45',1650,630,15,60,{color: '#555555',border_radius:10, innerText: ''});
new Element('46',1650,800,400,250,{color: '#a0a0a0',border_radius:10, innerText: ''});
new Element('47',1650,725,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'Present', text_size: 50});
new Element('48',1650,775,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'New drugs have been approved', text_size: 25});
new Element('49',1650,810,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'by the FDA to treat SCD, and', text_size: 25});
new Element('50',1650,845,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'researchers are developing', text_size: 25});
new Element('51',1650,880,200,200,{color: '#d0d0d000',border_radius:10, innerText: 'genetic cures.', text_size: 25});
*/
/*
//new Element('4',560,100,320,100,{color: '#ffffffb0',border_radius:10});
//new Element('5',1040,100,320,100,{color: '#ffffffb0',border_radius:10});
//new Element('6',1520,100,320,100,{color: '#ffffffb0',border_radius:10});
new Element('7',600,350,1100,150,{color:"#909090b0",border_radius:20,innerText: "Sickle Cell Disease", text_size: 100})
new Element('100',600,500,1100,100,{color:"#abcdef",border_radius:20,innerText: "Some trivia stuff here: "})
new Element('8',300,675,500,200,{color:"#909090b0",border_radius:20,innerText: "Thing 1: "})
new Element('9',300,925,500,200,{color:"#909090b0",border_radius:20,innerText: "Thing 2: "})
new Element('10',900,675,500,200,{color:"#909090b0",border_radius:20,innerText: "Thing 3: "})
new Element('11',900,925,500,200,{color:"#909090b0",border_radius:20,innerText: "Thing 4: "})
*/
requestAnimationFrame(Window.refresh);