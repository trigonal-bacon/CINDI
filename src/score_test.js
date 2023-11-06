import { test_cases } from "./testcases.js";
import Jimp from "jimp";
import { is_in_path } from "./InPath.js";
import Excel from "exceljs";

const SECONDS_PER_PIXEL = 0.7208180147;
const KILOMETERS_PER_PIXEL = 0.06003752345;
const IMAGE_WIDTH = 1088;
const IMAGE_HEIGHT_NORM = 533;
const IMAGE_HEIGHT_2 = 525;

const COLOR_VECTORS = [
    [0.9, 0.5, 0.1, -25],
    [0.9, 0.5, 0.1, -35],
    [1.2, 0.4, 0.1, -30],
    [1.2, 0.4, 0.1, -40],
    [2.0, 0.8, 0.1, -35],
    [2.0, 0.8, 0.1, -45],
    [1.0, 1.0, 1.0,  -0],
    [1.0, 0.3, 0.1, -25],
    [1.0, 0.3, 0.1, -30],
    [1.5, 0.3, -0.5, 50]
];

const SCORE_VECTORS = [
    [1.25, 0.25],
    [1.25, 0.3],
    [1.25, 0.35],
    [1.3, 0.25],
    [1.3, 0.3],
    [1.3, 0.35],
    [1.35, 0.25],
    [1.35, 0.35],
    [1.35, 0.4],
    [1.4, 0.3]
];

let CURR_COLOR_VECTOR = COLOR_VECTORS[0];
let CURR_SCORER_VECTOR = SCORE_VECTORS[0];

const color_score = (bmp, x, y) => {
    if (x < 0 || y < 0)
        return 0;
    const color = bmp[y * IMAGE_WIDTH + x];
    const red = color & 255;
    const green = (color >> 8) & 255;
    const blue = (color >> 16) & 255;
    return red * CURR_COLOR_VECTOR[0] + green * CURR_COLOR_VECTOR[1] + (blue) * CURR_COLOR_VECTOR[2] + CURR_COLOR_VECTOR[3];
}

const score_convolution_test = (path, bmp) => {
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
    for (let x = min_x; x <= max_x; ++x) {
        for (let y = min_y; y <= max_y; ++y) {
            if (is_in_path(path, x - IMAGE_WIDTH / 2, y - IMAGE_HEIGHT_NORM / 2)) {
                area++;
                area_sum += color_score(bmp, x, y);
            }
            else if (is_in_path(expanded_path, x - IMAGE_WIDTH / 2, y - IMAGE_HEIGHT_NORM / 2)) {
                boundary_area++;
                boundary_sum += color_score(bmp, x, y);
            }
        }
    }
    const ratio = area > 35 ? area_sum / area / (boundary_sum / boundary_area) : 0;
    return Math.max(Math.min((ratio - CURR_SCORER_VECTOR[0]) / CURR_SCORER_VECTOR[1], 1), 0);
}

const test_parameter_score = async (paths, date, url, pos) => {
    let [m, d, y] = date.split(" ").map(_=>parseInt(_));
    const usingV4_10 = y < 2020 || (y === 2020 && m < 7);
    y = (y | 0).toString().padStart(4, "0");
    m = (m | 0).toString().padStart(2, "0");
    d = (d | 0).toString().padStart(2, "0");
    if (pos < 1 || pos > 4)
        return "error in pos";
    if (usingV4_10)
        url = `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-10/${y}-${m}-${d}/${y}-${m}-${d}_${url}_V4.10_${pos}`;
    else
        url = `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-11/${y}-${m}-${d}/${y}-${m}-${d}_${url}_V4.11_${pos}`;
    let overplot, image_bitmap;
    await Promise.all([Jimp.read(url + "_1_overplot.png"), Jimp.read(url + "_1.png")]).then(v => {
        overplot = v[0];
        image_bitmap = v[1];
    });
    if (!overplot || !image_bitmap)
    {
        console.log("error in scoring");
        return "[]";
    }
    overplot.crop(82, 61, IMAGE_WIDTH, IMAGE_HEIGHT_NORM);
    image_bitmap.crop(82, 61, IMAGE_WIDTH, IMAGE_HEIGHT_NORM);
    const convolve_score = score_convolution_test(paths[0], new Uint32Array(image_bitmap.bitmap.data.buffer));
    return convolve_score;
}

const workbook = new Excel.Workbook();
workbook.addWorksheet('main', {});
const sheet = workbook.getWorksheet("main");
const test = async (case_number) => {
    case_number ||= 0;
    let overall = 0;
    let possible = 0;
    let num = 0;
    CURR_COLOR_VECTOR = COLOR_VECTORS[case_number % 10];
    CURR_SCORER_VECTOR = SCORE_VECTORS[Math.floor(case_number / 10)];
    sheet.getRow(2 + case_number).getCell(++num).value = "Set " + (case_number + 1);
    for (const test_case of test_cases)
    {
      const { path, date, url, pos } = test_case;
      const score = await test_parameter_score(path, date, url, pos);
      let residual = test_case.cloud ? score : 2 * (1 - score);
      possible += test_case.cloud ? 1 : 2;
      sheet.getRow(2 + case_number).getCell(++num).value = residual;
      //console.log(score.toFixed(2), residual.toFixed(2));
      overall += residual;
    }
    sheet.getRow(2 + case_number).getCell(++num).value = overall;
    console.log("case", case_number + 1, ":", overall.toFixed(2), "/", possible);
}
sheet.getRow(1).getCell(1).value = "Parameters";
sheet.getRow(1).getCell(22).value = "Overall Score";
for (let n = 2; n < 20 + 2; ++n) sheet.getRow(1).getCell(n).value = "Test " + (n - 1);
for (let n = 0; n < 100; ++n) await test(n);
await workbook.xlsx.writeFile("data.xlsx");
//test();