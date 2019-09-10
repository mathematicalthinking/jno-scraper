const mongoose = require("mongoose");
const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
// const Nightmare = require("nightmare");
const chalk = require("chalk");
require("chromedriver");
// const nightmare = Nightmare({ show: true });
const Room = require("./Room");
// const PROJECT_COUNT = 200;

const { Builder, By } = require("selenium-webdriver");
const helpers = require("./helpers");

require("dotenv").config();
async function scrape(counts) {
  const { projectCount, subjectCount, topicCount, roomCount } = counts;
  let driver = null;

  try {
    let url = "http://192.168.1.110/VMTLobby/commons/index.jsp";
    driver = new Builder().forBrowser("chrome").build();
    let usernameSel = "input[name='j_username']";
    let passwordSel = "input[name='j_password']";
    let submitSel = "input[name='submit']";
    let communityListSel = `#communityList1`;

    let saveAsJnoBtnSel = 'input[type=button][value="Save as JNO"]';
    let subjectListItemSel = "#subjectsList > li";
    // subject > room > topic > download
    async function login() {
      await helpers.navigateAndWait(driver, url, usernameSel);
      await helpers.findInputAndType(driver, usernameSel, process.env.user);
      await helpers.findInputAndType(driver, passwordSel, process.env.pw);
      await helpers.findAndClickElement(driver, submitSel);
      await helpers.waitForSelector(driver, communityListSel);
    }

    await login();

    let project = await helpers.selectOption(
      driver,
      communityListSel,
      projectCount,
      true
    );

    let projectName = await project.getAttribute("innerText");

    await project.click();
    await helpers.findAndClickElement(driver, "input[name='refreshButton']");

    await driver.sleep(1000);
    await helpers.waitForSelector(driver, "#subjectsList");

    let subjectListItems = await helpers.getWebElements(
      driver,
      subjectListItemSel
    );
    let subject = subjectListItems[subjectCount];
    let subjectName = await subject.getAttribute("innerText");
    let subjectExpandBtn = await subject.findElement({ xpath: "./img[1]" });
    await subjectExpandBtn.click();
    await helpers.waitForElementsChild(driver, subject, "./ul[1]");
    let topicList = await subject.findElement({ xpath: "./ul[1]" });
    let topicListEl = await topicList.findElement({ xpath: "./li[1]" });
    let roomExpandBtn = await topicListEl.findElement({ xpath: "./img[1]" });
    let topicLink = await topicListEl.findElement({ xpath: "./span/a" });
    topicName = await topicLink.getAttribute("innerText");

    await roomExpandBtn.click();
    let roomList = await topicListEl.findElement({ xpath: "./ul[1]" });
    await helpers.waitForElementsChild(driver, roomList, "./li[1]");
    let room = await roomList.findElement({ xpath: "./li[1]" });
    roomName = await room.getAttribute("innerText");
    let showDownloadBtn = await room.findElement({ xpath: "./img[1]" });
    await showDownloadBtn.click();
    await helpers.waitForElementsChild(driver, room, "./div[1]");
    await helpers.findAndClickElement(driver, "input[value='Save as JNO']");

    await new Promise((resolve, reject) => {
      setTimeout(() => resolve(), 1000);
    });

    projectName = projectName.trim();
    subjectName = subjectName.trim();
    topicName = topicName.trim();
    roomName = roomName.trim();

    let results = {
      document: {
        projectName,
        subjectName,
        topicName,
        roomName,
        path: `/${projectName}/${subjectName}/${topicName}/${roomName}.jno`
      },
      counts: {
        roomCount,
        topicCount,
        subjectCount,
        projectCount
      }
    };

    results.counts.projectCount++;

    if (projectCount > PROJECT_COUNT) {
      console.log("all done");
      mongoose.connection.close();
    }
    driver.quit();
    return results;
  } catch (err) {
    console.log({ err });
    mongoose.connection.close();
    driver.quit();
  }
}

async function getSubject() {}

async function recursiveScrape(counts) {
  try {
    const scrapeData = await scrape(counts);
    const {
      projectName,
      subjectName,
      topicName,
      roomName
    } = scrapeData.document;
    const srcPath = `../../../../../Downloads/${roomName}.jno`;
    const targetPath = `./JNOFiles/${projectName}/${subjectName}/${topicName}`;
    await buildPaths(targetPath);
    await saveFile(srcPath, targetPath + `/${roomName}.jno`);
    await saveToDb(scrapeData.document);
    console.log(chalk.blue("saved to db"));
    if (scrapeData.counts.projectCount > PROJECT_COUNT) {
      console.log(chalk.green("Scrape complete!"));
    } else {
      recursiveScrape(scrapeData.counts);
    }
  } catch (err) {
    console.log(chalk.red("Error"));
    console.log({ err });
  }
}

function saveToDb(data) {
  const room = new Room(data);
  return room.save();
}

function buildPaths(path) {
  return new Promise(async (resolve, reject) => {
    const directories = path.split("/");
    console.log({ directories });
    const paths = [];
    let p;
    for (i = 0; i < directories.length; i++) {
      p = "";
      for (x = 0; x <= i; x++) {
        if (x > 0) {
          p += "/";
        }
        p += directories[x];
      }
      paths.push(p);
    }
    paths.shift();
    try {
      await checkDirectoryRecursive(paths);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function checkDirectoryRecursive(dirs) {
  return new Promise((resolve, reject) => {
    dir = dirs.shift();
    fs.stat(dir, function(err, stats) {
      if (stats) {
        if (dirs.length > 0) {
          resolve(checkDirectoryRecursive(dirs));
        } else {
          resolve();
        }
      }
      //Check if error defined and the error code is "not exists"
      if (err && (err.errno === 34 || err.errno === -4058)) {
        //Create the directory, call the callback.
        fs.mkdir(dir, err => {
          if (err) {
            reject(err);
          }
          if (dirs.length > 0) {
            resolve(checkDirectoryRecursive(dirs));
          } else {
            return resolve();
          }
        });
      } else if (err) {
        reject(err);
      }
    });
  });
}

function saveFile(src, trg) {
  return new Promise((resolve, reject) => {
    fs.rename(src, trg, err => {
      if (err) {
        console.log(chalk.red("err renaming: ", err));
        reject(err);
      }
      console.log(chalk.green("file saved: ", trg));
      resolve("success");
    });
  });
}

let mongoURI = "mongodb://localhost/vmtjnofiles";
mongoose.connect(mongoURI, { useNewUrlParser: true }, (err, res) => {
  if (err) {
    console.log(chalk.red("DB CONNECTION FAILED: " + err));
  } else {
    console.log(chalk.blue("DB CONNECTION SUCCESS" + mongoURI));
    let projectCount = 1; // start at 1 because 0 is "All" we dont want all we want each project individually so we get its actual name instead of the name "All"
    let subjectCount = 0;
    let topicCount = 0;
    let roomCount = 0;
    const counts = { projectCount, subjectCount, topicCount, roomCount };
    console.log(chalk.green("starting scrape"));
    recursiveScrape(counts);
  }
});
