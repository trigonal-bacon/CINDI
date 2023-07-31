const Button = class {
    x = 0;
    y = 0;
    width = 75;
    height = 50;
    type = 0;
    constructor(x,y,type) {this.x = x; this.y = y; this.type = type}
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#692a08';
        ctx.beginPath();
        ctx.fillRect(-this.width/2,-this.height/2,this.width,this.height);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.font = `${this.height/2}px sans-serif`;
        ctx.lineWidth = this.height/10;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        switch(this.type) {
            case 0:
                ctx.strokeText('-', 0, 0);
                ctx.fillText('-', 0, 0);
                break;
            case 1:
                ctx.strokeText('+', 0, 0);
                ctx.fillText('+', 0, 0);
                break;
        }
        ctx.restore();
    }
}