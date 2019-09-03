const Nightmare = require("nightmare");
const nightmare = Nightmare({ show: true });
require("dotenv").config();
async function scrape() {
  try {
    console.log(process.env.user);
    await nightmare
      .goto("http://192.168.1.110/VMTLobby/commons/index.jsp")
      .insert("input[name='j_username']", process.env.user)
      .insert("input[name='j_password']", process.env.pw)
      .click("input[name='submit']")
      .wait(1000)
      .select("select[name='community']", "0")
      .click("input[name='refreshButton']")
      .wait(10000);
  } catch (err) {
    console.log({ err });
  }
}

scrape();
