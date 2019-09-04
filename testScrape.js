const Nightmare = require("nightmare");

const nightmare = Nightmare({
  openDevTools: { mode: "detach" },
  show: true,
  webPreferences: {
    partition: "persist: testing"
  }
});

require("dotenv").config();
let someData = "hello world";
async function scrape() {
  try {
    await nightmare
      .goto("https://en.wikipedia.org/wiki/Symphony_No._5_(Sibelius)")
      .evaluate(someData => {
        let title = document.querySelector("#firstHeading").innerHTML;
        localStorage.setItem("title", title);
        console.log(window.dataTitle);
      }, someData)
      .click("[href='/wiki/E-flat_major']")
      .evaluate(() => {
        let key = document.querySelector("#firstHeading").innerHTML;
        localStorage.setItem("key", key);
      })
      .wait(10000);
  } catch (err) {
    console.log({ err });
  }
}

scrape();
