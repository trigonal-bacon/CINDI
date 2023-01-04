/*
This is your site JavaScript code - you can add interactivity and carry out processing
- Initially the JS writes a message to the console, and moves a button you can add from the README
*/

// Print a message in the browser's dev tools console each time the page loads
// Use your menus or right-click / control-click and choose "Inspect" > "Console"
console.log("Hello 🌎");

/* 
Make the "Click me!" button move when the visitor clicks it:
- First add the button to the page by following the "Next steps" in the README
*/
const btn = document.getElementById("test"); // Get the button from the page
// Detect clicks on the button
if (btn) {
  btn.onclick = function () {
    // The JS works in conjunction with the 'dipped' code in style.css
    //btn.classList.toggle("dipped");
    const line = prompt("Enter a date");
    if (line) b(line);
  };
}
const b = async (date) => {
  date = date.replaceAll('/',' ');
  btn.innerHTML = 'loading';
  let resp = await fetch("https://trigonal-bacon-organic-eureka-g96rj4vp9vpf9gq4-8080.preview.app.github.dev/", {
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
// This is a single line JS comment
/*
This is a comment that can span multiple lines 
- use comments to make your own notes!
*/
