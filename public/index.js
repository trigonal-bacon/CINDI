import { ImageRenderer } from "./ImageHandler.js";
import { CloudBoundary } from "./CloudBoundary.js";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function canvas_resize() {
  const sidebar = document.getElementById("sidebar").getBoundingClientRect();
  canvas.width = window.innerWidth - sidebar.width;
  canvas.height = window.innerHeight - 60;
}

const handler = new ImageRenderer;

function main() {
  canvas_resize();
  handler.render_image(ctx);
  requestAnimationFrame(main);
}
requestAnimationFrame(main);

//html
let curr_elem = document.getElementById('enter-date');
curr_elem.onclick = () => {
  let input = document.getElementById('date').value;
  console.log(input);
  if (input.length > 7) {
    handler.request_date(input);
  }
}
curr_elem = document.getElementById('prev');
curr_elem.onclick = () => {
  if (handler.date_valid && handler.image_srcs.length) {
    if (handler.image_loaded) {
      if (handler.warning_message !== 1 && (handler.paths.length || handler.curr_path.length))
        handler.warning_message = 1;
      else {
        handler.warning_message = 0;
        handler.index = (handler.index - 1 + handler.image_srcs.length) % handler.image_srcs.length;
        handler.request_image();
      }
    }
  }
}
curr_elem = document.getElementById('next');
curr_elem.onclick = () => {
  if (handler.date_valid && handler.image_srcs.length) {
    if (handler.image_loaded) {
      if (handler.warning_message !== 1 && (handler.paths.length || handler.curr_path.length))
        handler.warning_message = 1;
      else {
        handler.warning_message = 0;
        handler.index = (handler.index + 1) % handler.image_srcs.length;
        handler.request_image();
      }
    }
  }
}
curr_elem = document.getElementById('zoom-in');
curr_elem.onclick = () => {
  if (handler.image_loaded) {
    handler.scale *= 1.25;
  }
}
curr_elem = document.getElementById('zoom-out');
curr_elem.onclick = () => {
  if (handler.image_loaded) {
    handler.scale *= 0.8;
  }
}
curr_elem = document.getElementById('zoom-reset');
curr_elem.onclick = () => {
  if (handler.image_loaded) {
    handler.scale = 1;
    handler.shift_x = handler.shift_y = 0;
  }
}
curr_elem = document.getElementById('undo');
curr_elem.onclick = () => {
  if (handler.image_loaded) {
    if (handler.curr_path.length) {
      handler.curr_path.pop();
      handler.curr_path.closed = false;
    }
    else if (handler.paths.length) {
      handler.curr_path = handler.paths.pop();
      handler.curr_path.pop();
      handler.curr_path.closed = false;
    }
  }
}

window.addEventListener("keydown", (e) => {
  if (!e.ctrlKey || e.code !== 'KeyZ')
    return;
  if (handler.image_loaded) {
    if (handler.curr_path.length) {
      handler.curr_path.pop();
      handler.curr_path.closed = false;
      handler.curr_path.scored = false;
    }
    else if (handler.paths.length) {
      handler.curr_path = handler.paths.pop();
      handler.curr_path.pop();
      handler.curr_path.closed = false;
      handler.curr_path.scored = false;
    }
  }
})
curr_elem = document.getElementById('reset-all');
curr_elem.onclick = async () => {
  if (handler.image_loaded && (handler.paths.length || handler.curr_path.length)) {
    if (handler.warning_message !== 1)
      handler.warning_message = 1;
    else {
      handler.paths = [];
      handler.curr_path = new CloudBoundary;
      handler.warning_message = 0;
    }
  }
}
let await_scoring = false;
curr_elem = document.getElementById('submit');
curr_elem.onclick = async () => {
  if (await_scoring)
    return;
  if (handler.image_loaded) {
    if (handler.curr_path.length && handler.warning_message !== 1)
      handler.warning_message = 1;
    else {
      let paths = handler.paths.filter(x => !x.scored || x.score === 'bad req');
      if (paths.length === 0)
      {
        document.getElementById('submit').innerHTML = 'Nothing to score';
        setTimeout(() => document.getElementById('submit').innerHTML = 'Submit', 2000);
        return;
      }
      handler.warning_message = 0;
      handler.submitted = true;
      handler.curr_path = new CloudBoundary;
      const obj = { path: paths, date: handler.date, url: handler.image_srcs[handler.index], pos: (handler.index & 3) + 1 };
      await_scoring = true;
      document.getElementById('submit').innerHTML = 'Scoring...';
      let resp = await fetch("http://127.0.0.1:8081/score", {
            method: "POST",
            body: JSON.stringify(obj),
      }).then((resp) => resp.text());
      resp = resp.split(',');
      let at = 0;
      for (let n = 0; n < handler.paths.length && at < resp.length; ++n) {
        if (handler.paths[n].scored)
          continue;
        const score = Math.max(resp[at++], 0);
        handler.paths[n].scored = true;
        handler.paths[n].score = score;
        if (score > 0.7)
          handler.paths[n].message = ["Amazing work!", "Excellent job!", "Great work!", "Fantastic!"][(Math.random() * 4) | 0];
      }
      await_scoring = false;
      document.getElementById('submit').innerHTML = 'Submit';
    }
  }
}



/*
hand-picking of clouds
App development for two different satellite missions
*/