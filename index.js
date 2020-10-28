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
    let url = helpers.baseURL + "/VMTLobby/commons/index.jsp"; // old: http://192.168.1.110/VMTLobby/commons/index.jsp
    driver = new Builder().forBrowser("chrome").build();
    // await driver
    //   .manage()
    //   .window()
    //   .setRect({ width: 1240, height: 1080, x: 0, y: 0 });
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
      console.log(chalk.gray("Log in complete!"));
    }

    await login();

    // PARSE PROJECT INFO
    if (!projectCountTarget) {
      await driver.sleep(1000);
      projectList = await driver.findElements(
        By.css("#communityList1 > option")
      );
      projectCountTarget = projectList.length - 1; // options are zero indexed so the last project is option #298
    }
    console.log(chalk.gray('Project Count Target: ', projectCountTarget));
    if (projectCount > projectCountTarget) {
      // done
      let results = {
        document: null,
        counts: {
          roomCount,
          topicCount,
          subjectCount,
          projectCount
        }
      };
      return results;

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
      currentSubjectCountTarget = subjectListItems.length - 1;
    }

    if (subjectListItems.length === 0) {
      console.log('Project has no subjects');
      // project has no subjects
      let results = {
        document: null,
        counts: {
          roomCount,
          topicCount,
          subjectCount,
          projectCount
        }
      };
      return results;

    }
    let subject = subjectListItems[subjectCount];
    let subjectName = await subject.getAttribute("innerText");
    // let subjectExpandBtn = await subject.findElement({ xpath: "./img[1]" });

    let subjectExpandBtn = await helpers.waitForElementsChild(driver, subject, "./img[1]");
    await subjectExpandBtn.click();
    let topicList = await helpers.waitForElementsChild(driver, subject, "./ul[1]");

    // TOPIC INFO
    // let topicList = await subject.findElement({ xpath: "./ul[1]" });
    await driver.sleep(200);
    let topicListEls = await topicList.findElements({ xpath: "./li" });
    if (!currentTopicCountTarget) {
      // topicListEls = await topicList.findElements({ xpath: "./li" });
      currentTopicCountTarget = topicListEls.length;

    }

    if (topicListEls.length === 0) {
      // subject has no topics
      console.log('subject has no topics');
      let results = {
        document: null,
        counts: {
          roomCount,
          topicCount,
          subjectCount,
          projectCount
        }
      };
      return results;

    }


    // let topicListEl = await topicList.findElement({
    //   xpath: `./li[${topicCount + 1}]`
    // });
    let topicListEl = await helpers.waitForElementsChild(
      driver,
      topicList,
      `./li[${topicCount + 1}]`
    );

    if (!topicListEl) {
      console.log(`Topic list had ${topicListEls.length} topics but could not find topic ${topicCount + 1} `);
    }

    // let roomExpandBtn = await topicListEl.findElement({ xpath: "./img[1]" });
    let roomExpandBtn = await helpers.waitForElementsChild(driver, topicListEl, "./img[1]");
    // let topicLink = await topicListEl.findElement({ xpath: "./span/a" });
    let topicLink = await helpers.waitForElementsChild(driver, topicListEl, "./span/a")
    topicName = await topicLink.getAttribute("innerText");

    // ROOM INFO
    await roomExpandBtn.click();

    let roomList = await helpers.waitForElementsChild(driver, topicListEl, "./ul[1]");
    // let roomList = await topicListEl.findElement({ xpath: "./ul[1]" });
    // console.log(`Found room list for topic ${topicName}`);
    await driver.sleep(200);
    let roomListEls = await roomList.findElements({ xpath: "./li" });
    console.log(`Room List for ${topicName} has ${roomListEls.length} rooms`);

    if (!currentRoomCountTarget) {
      currentRoomCountTarget = roomListEls.length;
    }

    if (roomListEls.length === 0) {
      // no rooms afte expanding topic
      console.log('no rooms after expanding topic: ', topicName);
      let results = {
        document: null,
        counts: {
          roomCount,
          topicCount,
          subjectCount,
          projectCount
        }
      };
      return results;

    }
    let room = await helpers.waitForElementsChild(
      driver,
      roomList,
      `./li[${roomCount + 1}]`
    );
    if (!room) {
      console.log(`Room list had elements but no room found`);
    }

    // let room = await roomList.findElement({ xpath: `./li[${roomCount + 1}]` });
    // console.log({room});
    roomName = await room.getAttribute("innerText");
    if (!room) {
      console.log(`Room list had elements but no room found`);
    }

    let roomLink = await helpers.waitForElementsChild(
      driver,
      room,
      `./img`
    );
    let CID = await roomLink.getAttribute("id");
    console.log('CID: ', CID);
    
    // let showDownloadBtn = await room.findElement({ xpath: "./img[1]" });
    let showDownloadBtn = await helpers.waitForElementsChild(driver, room, "./img[1]");
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
    // DL phase start
    // Below is legacy code retained for educational curiosity: these selectors should work in theory, but did not work in practice, resulting in a refactor to URL generation
    // try {
    //   await helpers.findAndDLElement(driver, "ul[id='subjectsList'] input[value='Save as JNO']");  // or div[id^='room_CID'] $TODO need to add .csv download, Need to refactor to get onClick and get()
    // } catch (err) {
    //   console.log(chalk.red("download btn error??"));
    //   console.log(err);
    //   console.log("trying again");
    //   driver.sleep(2000);
    //   try {
    //     await helpers.findAndDLElement(driver, "div[id^='room_CID'] input[value='Save as JNO']");  //ul[@id='subjectsList']//input[@value='Save as JNO']
    //   } catch (err) {
    //     error = "download button couldnt be clicked";
    //   }
    // }
    // URL generation method
   // SAVE RESULTS
   projectName = projectName.trim().replace(/[\/:]/g, ".");
   subjectName = subjectName.trim().replace(/[\/:]/g, ".");
   topicName = topicName.trim().replace(/[\/:]/g, ".");
   roomName = roomName.trim().replace(/[\/:]/g, ".");

    // .jno DL
    try {
      await helpers.findAndDLbyURL(driver, roomName, CID)
    } catch (err) {
      console.log(chalk.red("download btn error??"));
      console.log(err);
      console.log("trying again");
      driver.sleep(2000);
      try {
        await helpers.findAndDLElement(driver, "div[id^='room_CID'] input[value='Save as JNO']");  //ul[@id='subjectsList']//input[@value='Save as JNO']
      } catch (err) {
        error = "download button couldnt be clicked";
      }
    }

    // .csv DL
    // try {
    //   await helpers.findCSVAndDLbyURL(driver, roomName, CID)
    // } catch (err) {
    //   console.log(chalk.red("download btn error??"));
    //   console.log(err);
    //   console.log("trying again");
    //   driver.sleep(2000);
    //   try {
    //     await helpers.findCSVAndDLbyURL(driver, "div[id^='room_CID'] input[value='Get Log: columns for each user']");  //ul[@id='subjectsList']//input[@value='Save as JNO']
    //   } catch (err) {
    //     error = "download button couldnt be clicked";
    //   }
    // }

 
    // WAIT FOR FILE TO DOWNLOAD
    console.log("waiting for file to download...");
    await confirmFileDownloaded(roomName);
    // await confirmCSVDownloaded(roomName);
    const path = `/${projectName}/${subjectName}/${topicName}/${roomName}.jno`;
    // var cleanPath = path.replace(/[|&;$%@":<>()+,]/g, "");
    console.log({ path });
    // DL Phase end
    let results = {
      document: {
        projectName,
        subjectName,
        topicName,
        roomName,
        path
      },
      counts: {
        roomCount,
        topicCount,
        subjectCount,
        projectCount
      }
    };

    if (error) {
      console.log('results', results);
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
    console.log("Startime: ", startTime);
    const fileCheckerInterval = setInterval(() => {
      fs.stat(`${`/Users/${process.env.whoami}/Downloads/${fileName}.jno`}`, function(  // fs.stat(`${`/Users/Dan/Downloads/${fileName}.jno`}`
        err,
        stats
      ) {
        if (stats) {
          clearInterval(fileCheckerInterval);
          console.log("the .jno file has been downloaded");
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

async function confirmCSVDownloaded(fileName) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log("Startime: ", startTime);
    const fileCheckerInterval = setInterval(() => {
      fs.stat(`${`/Users/${process.env.whoami}/Downloads/${fileName}.csv`}`, function(  // fs.stat(`${`/Users/Dan/Downloads/${fileName}.jno`}`
        err,
        stats
      ) {
        if (stats) {
          clearInterval(fileCheckerInterval);
          console.log("the .csv file has been downloaded");
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
    console.log('scrape data: ', {scrapeData})
    if (scrapeData.document !== null) {
      const {
        projectName,
        subjectName,
        topicName,
        roomName
      } = scrapeData.document;
      const srcPath = `/Users/${process.env.whoami}/Downloads/${roomName}.jno`;
      // const CSBsrcPatch = `/Users/${process.env.whoami}/Downloads/${roomName}.csv`;
      const targetPath = `/Users/${process.env.whoami}/Documents/Data/21pstem/jno-scraper/ALLFiles/${projectName}/${subjectName}/${topicName}`;
      await buildPaths(targetPath);
      const { success, err } = await saveFile(
        srcPath,
        targetPath + `/${roomName}.jno`
      );
      // const { CSVsuccess, CSVerr } = await saveFile(
      //   CSBsrcPatch,
      //   targetPath + `/${roomName}.csv`
      // );
      if (err) {
        scrapeData.document.error = err;
      }
      await saveToDb(scrapeData.document);
      console.log(chalk.blue("saved to db"));

    }
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
      if (err && (err.errno === -2 || err.errno === 34 || err.errno === -4058)) {
        //Create the directory, call the callback.
        fs.mkdir(dir, err => {
          if (err) {
            reject(err);
          } else if (dirs.length > 0) {
            resolve(checkDirectoryRecursive(dirs));
          } else {
            return resolve({ succes: "succes", err: null });
          }
        });
      } else if (err) {
        resolve({ success: null, err: "couldnt make directory" });
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
      } else {
        console.log(chalk.green("file saved: ", trg));
        resolve({ success: "success", err: null });
      }
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
    let subjectCount = 0;
    let topicCount = 0;
    let roomCount = 0;
    const counts = { projectCount, subjectCount, topicCount, roomCount };
    console.log('Counts:', counts );
    console.log(chalk.yellow("~~~~~~~~~~ "), chalk.green("Starting scrape"), chalk.yellow(" ~~~~~~~~~~"));
    recursiveScrape(counts);
  }
});
