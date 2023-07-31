
const ImageRenderer = class {
    scale = 1;
    shift_x = 0;
    shift_y = 0;
    cache_canvas = new OffscreenCanvas(1,1);

    cache_image = new Image();
    image_loaded = false;
    index = 0;
    date = "6/13/2006";
    constructor() {
        this.cache_image.onload = () => {
            this.image_loaded = true;
            this.cache_canvas.width = this.cache_image.width - 212;
            this.cache_canvas.height = 533;
            this.cache_canvas.getContext('2d').drawImage(this.cache_image, -82, -60);
        }
    }
    get width() { return this.cache_canvas.width; }
    get height() { return this.cache_canvas.height; }
    get x() { return window.innerWidth / 2; }
    get y() { return window.innerHeight / 2; }
    render(ctx) {

    }
}