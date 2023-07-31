import Jimp from "jimp";
import { is_in_path } from "./InPath.js";
import { writeFile, createWriteStream, open } from "fs";

const SECONDS_PER_PIXEL = 0.7208180147;
const KILOMETERS_PER_PIXEL = 0.06003752345;
const IMAGE_WIDTH = 1088;
const IMAGE_HEIGHT_NORM = 533;
const IMAGE_HEIGHT_2 = 525;

const color_score = (bmp, x, y) => {
    if (x < 0 || y < 0)
        return 0;
    const color = bmp[y * IMAGE_WIDTH + x];
    const red = color & 255;
    const green = (color >> 8) & 255;
    const blue = (color >> 16) & 255;
    return red * 1 + green * 0.5 + (blue) * 0.2 - 35;
}

const TROPOPAUSE_RANGE = 50;
const score_height = (path, bmp) => {
    console.log("Scoring Height");
    const width = IMAGE_WIDTH;
    const height = IMAGE_HEIGHT_NORM;
    let failed = 0;
    for (let point of path) {
        
        const x = (point[0] + IMAGE_WIDTH / 2) | 0;
        const y = (point[1] + IMAGE_HEIGHT_NORM / 2) | 0;
        let in_range = false;
        //for (let n = y - TROPOPAUSE_RANGE; n <= y + TROPOPAUSE_RANGE; n += 2)
        for (let n = 0; n <= 532; n += 2)
            if (bmp[n * width + x] === 0xff2f3f37) {
                in_range = Math.abs(y - n) < TROPOPAUSE_RANGE;
                point[2] = n - IMAGE_HEIGHT_NORM / 2;
                break;
            }
        if (!in_range)
        {
            ++failed;
            console.log("Not in range");
        }
    }
    return Math.min(failed / path.length, 0.5) * 2;
}

const score_convolution = (path, bmp, fbmp) => {
    console.log("scoring density")
    let min_x = 10000, min_y = 10000, max_x = 0, max_y = 0;
    let center_x = 0, center_y = 0;
    for (let [x, y] of path) {
        center_x += x;
        center_y += y;
    }
    center_x /= path.length;
    center_y /= path.length;
    const expanded_path = [];
    for (let [x, y] of path) {
        let deltaX = x - center_x;
        let deltaY = y - center_y;
        const magnitude = Math.hypot(deltaX, deltaY);
        deltaX += 5 * deltaX / magnitude;
        deltaY += 5 * deltaY / magnitude;
        expanded_path.push([center_x + deltaX, center_y + deltaY]);
        x = (deltaX + center_x + IMAGE_WIDTH / 2) | 0;
        if (x < 0)
            x = 0;
        y = (deltaY + center_y + IMAGE_HEIGHT_NORM / 2) | 0;
        if (y < 0)
            y = 0;
        if (!(min_x < x))
            min_x = x;
        if (!(max_x > x))
            max_x = x;
        if (!(min_y < y))
            min_y = y;
        if (!(max_y > y))
            max_y = y;
    }
    let area_sum = 0;
    let area = 0;
    let boundary_area = 0;
    let boundary_sum = 0;
    let grey_area = 0;
    let overplot_score = 0;
    for (let x = min_x; x <= max_x; ++x) {
        for (let y = min_y; y <= max_y; ++y) {
            if (is_in_path(path, x - IMAGE_WIDTH / 2, y - IMAGE_HEIGHT_NORM / 2)) {
                area++;
                area_sum += color_score(bmp, x, y);
                const color = bmp[y * IMAGE_WIDTH + x];
                const red = color & 255;
                const green = (color >> 8) & 255;
                const blue = (color >> 16) & 255;
                if (red > 100 && green > 100 && blue > 100)
                    ++grey_area;
                const color2 = fbmp[((y * IMAGE_HEIGHT_2 / IMAGE_HEIGHT_NORM) | 0) * IMAGE_WIDTH + x];
                if (color2 === 0xffffdc00)
                    overplot_score += 1
                else if (color2 === 0xffff2600 || color2 === 0xffffffff)
                    overplot_score += 0.75;
            }
            else if (is_in_path(expanded_path, x - IMAGE_WIDTH / 2, y - IMAGE_HEIGHT_NORM / 2)) {
                boundary_area++;
                boundary_sum += color_score(bmp, x, y);
            }
        }
    }
    console.log("Main: ", area_sum / area, area, grey_area);
    console.log("Boundary: ", boundary_sum / boundary_area, boundary_area);
    console.log("Overplot: ", overplot_score / area);
    const ratio = area > 30 ? area_sum / area / (boundary_sum / boundary_area) : 0;
    const grey_score = Math.max(Math.min(20 * (grey_area / area) - 0.01, 1), 0);
    console.log("Ratio: ", ratio);
    console.log("Grey Area Score: ", grey_score);
    return [Math.max(Math.min((ratio - 1.3) / 0.22, 1), 0), grey_score, overplot_score / area];
}

const time_add = (t1, t2) => {
    let [h1, m1, s1] = t1;
    const [h2, m2, s2] = t2;
    h1 += h2;
    m1 += m2;
    s1 += s2;
    if (s1 >= 60) {
        m1 += Math.floor(s1 / 60);
        s1 = s1 % 60;
    }
    if (m1 >= 60) {
        h1 += Math.floor(m1 / 60);
        m1 = m1 % 60;
    }
    h1 = h1 % 24;
    return [h1, m1, s1];
}

export const cindi_score = async (paths, date, url, pos) => {
    console.log("scoring");
    let [m, d, y] = date.split(" ").map(_=>parseInt(_));
    const usingV4_10 = y < 2020 || (y === 2020 && m < 7);
    y = (y | 0).toString().padStart(4, "0");
    m = (m | 0).toString().padStart(2, "0");
    d = (d | 0).toString().padStart(2, "0");
    let time = url.split('-').map(x => parseInt(x)).filter(x => x === x);
    if (time.length !== 3) {
        console.log("time invalid");
        return "[]";
    }
    time = time_add(time, [0, 13 * pos, 4.25 * pos]); //52 min and 17 seconds approx for orbit
    if (pos < 1 || pos > 4)
        return "error in pos";
    if (usingV4_10)
        url = `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-10/${y}-${m}-${d}/${y}-${m}-${d}_${url}_V4.10_${pos}`;
    else
        url = `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-11/${y}-${m}-${d}/${y}-${m}-${d}_${url}_V4.11_${pos}`;
    let feature_mask, overplot, image_bitmap;
    await Promise.all([Jimp.read(url + "_6.png"), Jimp.read(url + "_1_overplot.png"), Jimp.read(url + "_1.png")]).then(v => {
        feature_mask = v[0];
        overplot = v[1];
        image_bitmap = v[2];
    });
    if (!feature_mask || !overplot || !image_bitmap)
    {
        console.log("error in scoring");
        return "[]";
    }
    feature_mask.crop(82, 61, IMAGE_WIDTH, IMAGE_HEIGHT_2);
    overplot.crop(82, 61, IMAGE_WIDTH, IMAGE_HEIGHT_NORM);
    image_bitmap.crop(82, 61, IMAGE_WIDTH, IMAGE_HEIGHT_NORM);
    const scores = [];
    const parts = [];
    for (const path of paths) {
        if (path.length > 25)
        {
            scores.push(0);
            parts.push([]);
            continue; //don't want to overload the server
        }
        const h_score = score_height(path, new Uint32Array(overplot.bitmap.data.buffer));
        const [convolve_score, grey_score, feature_score] = score_convolution(path, new Uint32Array(image_bitmap.bitmap.data.buffer), new Uint32Array(feature_mask.bitmap.data.buffer));
        parts.push([h_score, feature_score, convolve_score, grey_score]);
        scores.push(convolve_score * 2/3 + feature_score * 1/3 - h_score * 1/4 - grey_score * 1/3);    
    }
    console.log(scores, parts);
    //return the array of scores
    const stream = createWriteStream(`scores/${y}-${m}-${d}`,{flags:'a'});
    stream.once("open", (fd) => {
        for (let n = 0; n < paths.length; ++n)
        {
            if (scores[n] < 0.7)
                continue;
            let string = `${y}-${m}-${d},[`;
            for (let [x,y,trop_h] of paths[n]) {
                const [p_h,p_m,p_s] = time_add(time, [0,0,(x+IMAGE_WIDTH/2)*SECONDS_PER_PIXEL]);
                y = 30 - (y + IMAGE_HEIGHT_NORM/2)*KILOMETERS_PER_PIXEL;
                trop_h = 30 - (trop_h + IMAGE_HEIGHT_NORM/2)*KILOMETERS_PER_PIXEL;
                string += `${p_h|0}-${p_m|0}-${p_s|0},${y},${trop_h},`;
            }
            string = string.slice(0,string.length-1);
            string += `],${scores[n]},${parts[n].toString()}\n`;
            console.log("writing", string);
            stream.write(string);
        }
        stream.close();
    });
    return scores.toString();
}