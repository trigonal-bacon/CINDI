class ImageHandler {
  constructor() {
    this.imageSrcList = [];
    this.pos = 0;
    const btn = document.getElementById("choose");
    btn.onclick = async _ => {
      document.getElementById("input").value && await this.fetch(document.getElementById("input").value);
      this.refreshHTML();
    };
    document.getElementById("prev").onclick = _ => {
      if (!this.imageSrcList.length) return;
      this.pos = (this.imageSrcList.length + this.pos - 1) % this.imageSrcList.length;
      this.refreshHTML();
    }
    document.getElementById("next").onclick = _ => {
      if (!this.imageSrcList.length) return;
      this.pos = (this.pos+1) % this.imageSrcList.length;
      this.refreshHTML();
    }
  }
  async fetch(date) {
    date = date.replaceAll('/',' ');
    let resp = await fetch(location.href.split("browseUI")[0], {
      method: "POST",
      body: date.toString(),
    }).then((resp) => resp.text());
    try {
      this.imageSrcList = JSON.parse(resp);
      this.pos = 0;
    } catch (err) {
      console.log("ERR:AN ERROR OCCURED", err);
      console.log(resp);
    }
  }
  refreshHTML() {
    document.getElementById('showing-image').src = this.imageSrcList[this.pos] ?? null;
  }
}
window.i = new ImageHandler();

