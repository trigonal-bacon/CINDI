import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import imageToBase64 from "image-to-base64";
export const requestDate = (m, d, y) => {
    /*
    input conversion and sanitization
    */
    if (y < 2006) {
        y = 2006;
        m = 6;
        d = 13;
    } else if (y === 2006 && m < 6) {
        m = 6;
        d = 13;
    } else if (y === 2006 && m === 6 && d < 13) d = 13;
    const usingV4_10 = y < 2020 || (y === 2020 && m < 7);

    y = (y | 0).toString().padStart(4, "0");
    m = (m | 0).toString().padStart(2, "0");
    d = (d | 0).toString().padStart(2, "0");
    /*
    older versions of calipso use a different format for urls
    */
    const fileName = usingV4_10
    ? `std_v4_showdate.php\?browse_date=${y}-${m}-${d}`
    : `std_v411_showdate.php\?browse_date=${y}-${m}-${d}`;
    /*
    if file exists, no need to wget again
    */
    const openFile = (name) => {
        const USING_WINDOWS = true; //if using windows
        if (USING_WINDOWS) name = name.replaceAll("?", "@");
        try {
            const file = readFileSync(name);
            return Buffer.from(file).toString();
        } catch (err) {
            //console.log(err);
            return false;
        }
    };
    const file = openFile(fileName);
    if (file) {
        let matchingOrbitTimes = file.split(',');
        if (matchingOrbitTimes !== null) {
            matchingOrbitTimes = matchingOrbitTimes.map(val => [val,val,val,val]).flat()
            if (usingV4_10)
                matchingOrbitTimes = matchingOrbitTimes.map(
                    (time, index) =>
                    `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-10/${y}-${m}-${d}/${y}-${m}-${d}_${time}_V4.10_${(index & 3) + 1}_1.png`
                );
            else
                matchingOrbitTimes = matchingOrbitTimes.map(
                    (time, index) =>
                    `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-11/${y}-${m}-${d}/${y}-${m}-${d}_${time}_V4.11_${(index & 3) + 1}_1.png`
                );
            return matchingOrbitTimes;
        } else {
            return "ERR:SERVER_HANDLING_EXCEPTION";
        }
    }
    /*
    try 2 times to access file
    */
    for (let tries = 0; tries < 2; tries++) {
        const url = `https://www-calipso.larc.nasa.gov/products/lidar/browse_images/${fileName}`;
        try {
            execSync(`wget '${url}'`);
        } catch (error) {
            if (error.toString().includes("Server Error.")) {
                //console.log(error.toString());
                return "ERR:INVALID_DATE";
            } else {
                console.log(error);
            }
        }
        const file = openFile(fileName);
        if (file) {
            const match = usingV4_10
            ? /show_v4_detail.php\?s=production&v=V4-10&browse_date=\d{4}-\d{2}-\d{2}&orbit_time=(\d{2}-\d{2}-\d{2})&page.+hdf/g
            : /show_v411_detail\.php\?s=production&v=V4-11&browse_date=\d{4}-\d{2}-\d{2}&orbit_time=(\d{2}-\d{2}-\d{2})&page.+hdf/g;
            let matchingOrbitTimes = file.match(match);
            try {
                execSync(`rm ${fileName.replaceAll("?", "@")}`);
            } catch(err) {
                console.log(err);
            }
            if (matchingOrbitTimes !== null) {
                matchingOrbitTimes = matchingOrbitTimes
                    .map((str) => str.split("orbit_time=")[1].split("&page")[0]);
                writeFileSync(
                    fileName.replaceAll("?", "@"),
                    new TextEncoder().encode(matchingOrbitTimes.filter((_,i)=>i%4==0).toString())
                );
                if (usingV4_10)
                    matchingOrbitTimes = matchingOrbitTimes.map(
                        (time, index) =>
                        `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-10/${y}-${m}-${d}/${y}-${m}-${d}_${time}_V4.10_${(index & 3) + 1}_1.png`
                    );
                else
                    matchingOrbitTimes = matchingOrbitTimes.map(
                        (time, index) =>
                        `https://www-calipso.larc.nasa.gov/data/BROWSE/production/V4-11/${y}-${m}-${d}/${y}-${m}-${d}_${time}_V4.11_${(index & 3) + 1}_1.png`
                    );
                return matchingOrbitTimes;
            } else {
                return "ERR:NO_MATCH";
            }
        }
    }
    return "ERR:OTHER";
}
export const convertTo64 = async url => {
    return await imageToBase64(url);
}