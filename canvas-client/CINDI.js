const cacheImage = new OffscreenCanvas(1088,533); //almost all images are this size
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let imageSrcList = [];
let leftmouse = false, rightmouse = false;
const weight = (r, g, b) => ((r + g / 2 - b) + 255) * 0.4;
const int32weight = (n) => weight(n & 255, n >> 8 & 255, n >> 16 & 255)
let firstX = 0, firstY = 0, startX = 0, startY = 0;
const fetchDate = async (date) => {
    date = date.replaceAll('/',' ');
    let resp = await fetch(location.href.split("browseUI")[0], {
        method: "POST",
        body: date.toString(),
    }).then((resp) => resp.text());
    try {
        imageSrcList = JSON.parse(resp);
        let resp2 = await fetch(location.href.split("browseUI")[0] + 'to-64', {
            method: 'POST',
            body: imageSrcList[0]
        }).then(resp => resp.text());
        const testImage = new Image();
        testImage.src = "data:image/png;base64," + resp2;
        function draw() {
            canvas.width = testImage.width;
            canvas.height = testImage.height;
            ctx.drawImage(cacheImage, 0, 0);
        }
        testImage.onload = (async () => {
            cacheImage.getContext('2d').drawImage(testImage, -82, -60);
            draw();
            canvas.onmousedown = (e) => {
                const {clientX, clientY, button} = e;
                e.preventDefault();
                if (button === 0) {
                    firstX = clientX;
                    firstY = clientY;
                    leftmouse = true;
                } else if (button === 2) {
                    startX = clientX;
                    startY = clientY;
                    rightmouse = true;
                }
            }
            canvas.onmousemove = ({clientX, clientY}) => {
                if (leftmouse) {
                    ctx.clearRect(-1,-1,canvas.width, canvas.height);
                    ctx.drawImage(cacheImage, 0, 0);
                    ctx.lineWidth = 1;
                    ctx.strokeRect(firstX, firstY, clientX - firstX, clientY - firstY);
                } else if (rightmouse) {
                    ctx.clearRect(-1,-1,canvas.width, canvas.height);
                    ctx.transform(1,0,0,1,(clientX-startX),(clientY-startY));
                    ctx.drawImage(cacheImage, 0, 0);
                    startX = clientX;
                    startY = clientY;
                }
            }
            canvas.onmouseup = (e) => {
                const {clientX, clientY, button} = e;
                e.preventDefault();
                pressedDown = false;
                ctx.clearRect(0,0,canvas.width, canvas.height);
                ctx.drawImage(cacheImage, 0, 0);
                let bitmap = new Int32Array(ctx.getImageData(firstX, firstY, clientX - firstX, clientY - firstY).data.buffer).map(_ => int32weight(_));
                domathon(bitmap);
                if (button === 0) leftmouse = false;
                else if (button === 2) rightmouse = false;
                //console.log(bitmap);
            }
            canvas.oncontextmenu = e => e.preventDefault();
        })
    } catch(_) {
        console.log("ERROR: ", _);
    }
}
const domathon = (arr) => {
    const assumption = 55; //assume that no cloud = average of 55
    let sum = 0, sumSq = 0;
    for (const v of arr) {
        sum += v;
        sumSq += (v-assumption)*(v-assumption);
    }
    sum /= arr.length; //average
    sumSq /= Math.sqrt(arr.length - 1);
    sumSq = Math.sqrt(sumSq); //standard deviation of sample
    console.log(sum, sumSq);
}
fetchDate("3/12/2020");