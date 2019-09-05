const mongoose = require("mongoose");
// const Nightmare = require("nightmare");
const chalk = require("chalk");
// const nightmare = Nightmare({ show: true });
const Room = require("./Room");
const PROJECT_COUNT = 200;

const { Builder, By } = require('selenium-webdriver');
const helpers = require('./helpers');


require("dotenv").config();
async function scrape(counts) {
  const { projectCount, subjectCount, topicCount, roomCount } = counts;
  let driver = null;

  try {
    let url = "http://192.168.1.110/VMTLobby/commons/index.jsp";
    driver = new Builder()
    .forBrowser('chrome')
    .build();

    let usernameSel = "input[name='j_username']";
    let passwordSel = "input[name='j_password']";
    let submitSel = "input[name='submit']";
    let communityListSel = `#communityList1`;

    let saveAsJnoBtnSel = 'input[type=button][value="Save as JNO"]';
    let subjectListItemSel = '#subjectsList > li';
    // subject > room > topic > download
    async function login() {
      await helpers.navigateAndWait(driver, url, usernameSel);
      await helpers.findInputAndType(driver, usernameSel, process.env.user);
      await helpers.findInputAndType(driver, passwordSel, process.env.pw);
      await helpers.findAndClickElement(driver, submitSel);
      await helpers.waitForSelector(driver, communityListSel);
    }

    await login();


    // let projectDropDown = await helpers.getWebWelementByCss(driver, `#communityList1`);

    // await projectDropDown.click();


    let project = await helpers.selectOption(driver, communityListSel, projectCount, true);

    let projectName = await project.getAttribute('innerText');
    console.log({projectName});

    await project.click();
    await helpers.findAndClickElement(driver, "input[name='refreshButton']");

    await driver.sleep(1000);
    await helpers.waitForSelector(driver, '#subjectsList');

    let subjectListItems = await helpers.getWebElements(driver, subjectListItemSel);

    if (subjectListItems) {
      subjectListItems.forEach((subjectListItem) => {

      });
    }
    let subject = subjectListItems[subjectCount];
    let subjectName = await subject.getAttribute('innerText');

    let subjectExpandBtn = await subject.findElement({xpath: './img[1]'});
    await subjectExpandBtn.click();

    await driver.sleep(5000);
    // topic is ul tag
    // each li is room
    let topic = await subject.findElement({xpath: './ul[1]'});
    if (topic) {
      topics = await topic.findElements({ xpath: './li'});
    }

    // let topicExpandBtn = await topic.findElement({css: ':first-child'});
    // await topicExpandBtn.click();

    let results = {
      document: {
        projectName,
        // subjectName,
        // topicName,
        // roomName,
        // fileName
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


    // await nightmare
    //   .goto("http://192.168.1.110/VMTLobby/commons/index.jsp")
    //   .insert("input[name='j_username']", process.env.user)
    //   .insert("input[name='j_password']", process.env.pw)
    //   .click("input[name='submit']")
    //   .wait(1000)
    //   .evaluate(projectCount => {
    //     // get project name, save to local storage, make clickable
    //     let project = document.querySelector(`#communityList1`).options[
    //       projectCount
    //     ];
    //     project.className = "projectToClick";
    //     localStorage.setItem("projectName", project.innerText);
    //     // return document.querySelector(`#communityList1`).options[projectCount]
    //     //   .innerText;
    //   }, projectCount)


    //   .click(".projectToClick")
    //   .click("input[name='refreshButton']")
    //   .evaluate(subjectCount => {
    //     // get subject name, save to local storage, make clickable
    //     let subject = document.querySelector(subjectCount);
    //     subject.className = "subjectToClick";
    //     localStorage.setItem("subjectName", subject.innerText);
    //   }, subjectCount)
    //   .click(".subjectToClick")
    //   .evaluate(topicCount => {
    //     let topic = document.querySelector(topicCount);
    //     topic.className = "topicToClick";
    //     localStorage.setItem("topicName", topic.innerText);
    //   }, topicCount)
    //   .click(".topicToClick")
    //   .evaluate(roomCount => {
    //     roomCount;
    //     let room = document.querySelector();

    //     // let fileName = room.name

    //     // download file and save pathName

    //     // get info out of local storage

    //     // increment room count

    //     // if last topic increment topic (same for subject and project)

    //     return {
    //       document: {
    //         projectName,
    //         subjectName,
    //         topicName,
    //         roomName,
    //         fileName
    //       },
    //       counts: {
    //         roomCount,
    //         topicCount,
    //         subjectCount,
    //         projectCount
    //       }
    //     };
    //   }, roomCount)
    //   .then(res => {
    //     console.log({ res });

    //     if (projectCount > PROJECT_COUNT) {
    //       console.log("all done");
    //       mongoose.connection.close();
    //     }
    //   })
    //   .catch(err => {
    //     console.log({ err });
    //     mongoose.connection.close();
    //   });
    // .wait(10000);
  } catch (err) {
    console.log({ err });
    mongoose.connection.close();
    driver.quit();
  }
}

async function recursiveScrape(counts) {
  try {
    const scrapeData = await scrape(counts);
    await saveToDb(scrapeData.document);
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
  console.log(chalk.blue("saving to db"));
  const room = new Room(data);
  return room.save();
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
