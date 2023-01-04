const btn = document.getElementById("test");
if (btn) {
  btn.onclick = function () {
    const line = prompt("Enter a date");
    if (line) b(line);
  };
}
const b = async (date) => {
  date = date.replaceAll('/',' ');
  btn.innerHTML = 'loading';
  let resp = await fetch(location.href, {
    method: "POST",
    body: date.toString(),
  }).then((resp) => resp.text());
  try {
    debugger;
    resp = JSON.parse(resp);
    debugger;
    let ct = 0;
    for (const src of resp) {
      const img = new Image();
      img.src = src;
      img.id = `image${ct++}`;
      //image width to height ratio is 1.95
      img.height = 300;
      img.width = img.height * 1.95;
      img.onclick = function () {
        console.log(this);
      }
      document.body.appendChild(img);
    }
    btn.innerHTML = 'loaded';
  } catch (err) {
    console.log("ERR:AN ERROR OCCURED", err);
    console.log(resp);
    btn.innerHTML = 'error';
    //there's an error, do error handling here
  }
}

