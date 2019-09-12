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

let projectCountTarget;
let currentSubjectCountTarget;
let currentTopicCountTarget;
let currentRoomCountTarget;

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
    let subjectListItemSel = "#subjectsList > li";
    let error = null;

    // subject > room > topic > download
    async function login() {
      await helpers.navigateAndWait(driver, url, usernameSel);
      await helpers.findInputAndType(driver, usernameSel, process.env.user);
      await helpers.findInputAndType(driver, passwordSel, process.env.pw);
      await helpers.findAndClickElement(driver, submitSel);
      await helpers.waitForSelector(driver, communityListSel);
    }

    await login();

    // PARSE PROJECT INFO
    if (!projectCountTarget) {
      await driver.sleep(1000);
      projectList = await driver.findElements(
        By.css("#communityList1 > option")
      );
      projectCountTarget = projectList.length;
    }
    let project;
    try {
      project = await helpers.selectOption(
        driver,
        communityListSel,
        projectCount,
        true
      );
    } catch (err) {
      console.log(chalk.red("couldnt select options 😢"));
      driver.sleep(2000);
      console.log("trying again");
      project = await helpers.selectOption(
        driver,
        communityListSel,
        projectCount,
        true
      );
    }
    let projectName = await project.getAttribute("innerText");
    await project.click();
    await helpers.findAndClickElement(driver, "input[name='refreshButton']");
    await driver.sleep(1000);
    await helpers.waitForSelector(driver, "#subjectsList");

    // PARSE SUBJECT INFO
    let subjectListItems = await helpers.getWebElements(
      driver,
      subjectListItemSel
    );

    if (!currentSubjectCountTarget) {
      currentSubjectCountTarget = subjectListItems.length;
    }
    let subject = subjectListItems[subjectCount];
    let subjectName = await subject.getAttribute("innerText");
    let subjectExpandBtn = await subject.findElement({ xpath: "./img[1]" });
    await subjectExpandBtn.click();
    await helpers.waitForElementsChild(driver, subject, "./ul[1]");

    // TOPIC INFO
    let topicList = await subject.findElement({ xpath: "./ul[1]" });

    if (!currentTopicCountTarget) {
      topicListEls = await topicList.findElements({ xpath: "./li" });
      currentTopicCountTarget = topicListEls.length;
    }
    let topicListEl = await topicList.findElement({
      xpath: `./li[${topicCount + 1}]`
    });
    let roomExpandBtn = await topicListEl.findElement({ xpath: "./img[1]" });
    let topicLink = await topicListEl.findElement({ xpath: "./span/a" });
    topicName = await topicLink.getAttribute("innerText");

    // ROOM INFO
    await roomExpandBtn.click();
    let roomList = await topicListEl.findElement({ xpath: "./ul[1]" });

    if (!currentRoomCountTarget) {
      roomListEls = await roomList.findElements({ xpath: "./li" });
      currentRoomCountTarget = roomListEls.length;
    }
    await helpers.waitForElementsChild(
      driver,
      roomList,
      `./li[${roomCount + 1}]`
    );
    let room = await roomList.findElement({ xpath: `./li[${roomCount + 1}]` });
    roomName = await room.getAttribute("innerText");
    let showDownloadBtn = await room.findElement({ xpath: "./img[1]" });
    try {
      await showDownloadBtn.click();
    } catch (err) {
      console.log(chalk.red("showDownload btn IN NON INTERACTABLE???"));
      console.log(err);
      console.log(" trying again");
      driver.sleep(2000);
      await showDownloadBtn.click();
    }
    await helpers.waitForElementsChild(driver, room, "./div[1]");
    try {
      await helpers.findAndClickElement(driver, "input[value='Save as JNO']");
    } catch (err) {
      console.log(chalk.red("download btn error??"));
      console.log(err);
      console.log("trying again");
      driver.sleep(2000);
      try {
        await helpers.findAndClickElement(driver, "input[value='Save as JNO']");
      } catch (err) {
        error = "download button couldnt be clicked";
      }
    }

    // SAVE RESULTS
    projectName = projectName.trim();
    subjectName = subjectName.trim();
    topicName = topicName.trim();
    roomName = roomName.trim();

    // WAIT FOR FILE TO DOWNLOAD
    console.log("waiting for file to download...");
    await confirmFileDownloaded(roomName);
    const path = `/${projectName}/${subjectName}/${topicName}/${roomName}.jno`;
    var cleanPath = path.replace(/[|&;$%@"<>()+,]/g, "");
    let results = {
      document: {
        projectName,
        subjectName,
        topicName,
        roomName,
        path: cleanPath
      },
      counts: {
        roomCount,
        topicCount,
        subjectCount,
        projectCount
      }
    };

    if (error) {
      results.document.error = error;
    }
    // results.counts.projectCount++;

    if (projectCount > projectCountTarget) {
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

async function confirmFileDownloaded(fileName) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log(startTime);
    const fileCheckerInterval = setInterval(() => {
      fs.stat(`${`../../../../../Downloads/${fileName}.jno`}`, function(
        err,
        stats
      ) {
        if (stats) {
          clearInterval(fileCheckerInterval);
          console.log("the file has been downloaded");
          resolve("success");
        } else if (err) {
          currentTime = Date.now();
          // console.log({ currentTime: Date.now() });
          if (currentTime - startTime > 10000) {
            clearInterval(fileCheckerInterval);
            resolve();
          }
          return;
        }
      });
    }, 1000);
  });
}

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
    const { success, err } = await saveFile(
      srcPath,
      targetPath + `/${roomName}.jno`
    );
    if (err) {
      scrapeData.document.error = err;
    }
    await saveToDb(scrapeData.document);
    console.log(chalk.blue("saved to db"));
    if (scrapeData.counts.projectCount > projectCountTarget) {
      console.log(chalk.green("Scrape complete!"));
      mongoose.connection.close();
      process.exit;
    } else {
      const updatedCounts = updateCounts(scrapeData.counts);
      recursiveScrape(updatedCounts);
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
      const { success, err } = await checkDirectoryRecursive(paths);
      resolve({ success, err });
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
          resolve({ success: "success", err: null });
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
            return resolve({ succes: "succes", err: null });
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
        resolve({ success: null, err: "could not download" });
      }
      console.log(chalk.green("file saved: ", trg));
      resolve({ success: "success", err: null });
    });
  });
}

function updateCounts({ roomCount, topicCount, subjectCount, projectCount }) {
  console.log({
    counts: { roomCount, topicCount, subjectCount, projectCount }
  });
  console.log({
    targets: {
      currentRoomCountTarget,
      currentSubjectCountTarget,
      currentTopicCountTarget,
      projectCountTarget
    }
  });
  roomCount += 1;
  if (roomCount >= currentRoomCountTarget) {
    topicCount += 1;
    roomCount = 0;
    currentRoomCountTarget = null;
  }

  if (topicCount >= currentTopicCountTarget) {
    subjectCount += 1;
    topicCount = 0;
    currentTopicCountTarget = null;
  }

  if (subjectCount > currentSubjectCountTarget) {
    subjectCount = 0;
    projectCount += 1;
    currentSubjectCountTarget = null;
  }
  console.log({
    updatedCounts: {
      roomCount,
      topicCount,
      subjectCount,
      projectCount
    }
  });
  return { roomCount, topicCount, subjectCount, projectCount };
}

let mongoURI = "mongodb://localhost/vmtjnofiles";
mongoose.connect(mongoURI, { useNewUrlParser: true }, (err, res) => {
  if (err) {
    console.log(chalk.red("DB CONNECTION FAILED: " + err));
  } else {
    console.log(chalk.blue("DB CONNECTION SUCCESS" + mongoURI));
    let projectCount = 1; // start at 1 because 0 is "All" we dont want all we want each project individually so we get its actual name instead of the name "All"
    let subjectCount = 6;
    let topicCount = 0;
    let roomCount = 1;
    const counts = { projectCount, subjectCount, topicCount, roomCount };
    console.log(chalk.green("starting scrape"));
    recursiveScrape(counts);
  }
});
