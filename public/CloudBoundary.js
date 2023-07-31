const is_within = (point_1, point_2, point_test) => {
    if (point_1 > point_2)
        return point_2 < point_test && point_test <= point_1;
    else
        return point_1 < point_test && point_test <= point_2;
}

export const is_in_path = (path, x, y) => {
    const len = path.length;
    if (len < 3)
        return;
    let h_count = 0, v_count = 0;
    for (let i = 0; i < len; ++i)
    {
        const [x1, y1] = path[i%len];
        const [x2, y2] = path[(i+1)%len];
        if (is_within(x1, x2, x))
        {
            //line_intersect();
            const lerp = (y1 == y2) ? 0.5 : (x - x1) / (x2 - x1);
            const proj_y = y1 + lerp * (y2 - y1);
            if (proj_y > y)
                ++v_count;
        }
        if (is_within(y1, y2, y))
        {
            //another line_intersect();
            const lerp = (x1 == x2) ? 0.5 : (y - y1) / (y2 - y1);
            const proj_x = x1 + lerp * (x2 - x1);
            if (proj_x > x)
                ++h_count;
        }
    }
    return !!((h_count * v_count) & 1);
}
export const CloudBoundary = class extends Array {
    center_x = 0;
    center_y = 0;
    width = 0;
    height = 0;
    hovered = false;
    closed = false;
    scored = false;
    score = 0;
    message = '';
    constructor(...args) {
        super(...args);
    }
    calcCenter() {
        let min_x = 10000, min_y = 10000, max_x = -10000, max_y = -10000;
        for (let [x, y] of this) {
            if (!(min_x < x))
                min_x = x;
            if (!(max_x > x))
                max_x = x;
            if (!(min_y < y))
                min_y = y;
            if (!(max_y > y))
                max_y = y;
        }
        this.center_x = (min_x + max_x) / 2;
        this.center_y = (min_y + max_y) / 2;
        this.width = max_x - min_x;
        this.height = max_y - min_y;
    }
}