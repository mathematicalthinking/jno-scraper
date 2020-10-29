/* eslint-disable no-use-before-define */
// REQUIRE MODULES
const { By, until, Key } = require("selenium-webdriver");
// const sharp = require('sharp');
const path = require("path");

// REQUIRE FILES
// const config = require('../../server/config');
// const css = require('./selectors');

// testing timeout values
const slowFactor = 1.3;
const timeoutMs = 4000 * (slowFactor); // timeout per await
let TOstr = ( slowFactor * 20 ) + 's'
const timeoutTestMsStr = TOstr; // timeout per test

const baseURL = "http://oldvmt.mathematicalthinking.org";

// const nconf = config.nconf;
// const port = nconf.get('testPort');
// const host = `http://localhost:${port}`;

// const loginUrl = `${host}/#/auth/login`;

const getCurrentUrl = async function (webdriver) {
  let url;
  try {
    url = await webdriver.getCurrentUrl();
  } catch (err) {
    console.log(err.message);
  }
  return url;
};

const isElementVisible = async function (webDriver, selector) {
  let isVisible = false;
  try {
    const webElements = await webDriver.findElements(By.css(selector));
    if (webElements.length === 1) {
      isVisible = await webElements[0].isDisplayed();
    }
  } catch (err) {
    if (err.name === "StaleElementReferenceError") {
      // element is no longer in dom
      return false;
    }
    console.log({ isElementVisibleError: err });
  }
  return isVisible;
};

const getWebElements = async function (webDriver, selector) {
  let webElements = [];
  try {
    webElements = await webDriver.findElements(By.css(selector));
  } catch (err) {
    console.log(err.message);
  }
  return webElements;
};

const getXPathElements = async function (webDriver, path) {
  let webElements = [];
  try {
    webElements = await webDriver.findElements(By.xpath(path));
  } catch (err) {
    console.log(err.message);
  }
  return webElements;
};

const getWebElementValue = async function (webDriver, selector) {
  let webElement, webValue;
  try {
    webElement = await webDriver.findElement(By.css(selector));
    webValue = await webElement.getAttribute("value");
  } catch (err) {
    console.log(err.message);
  }
  return webValue;
};

const getWebElementTooltip = async function (webDriver, selector) {
  let webElement, webValue;
  try {
    webElement = await webDriver.findElement(By.css(selector));
    webValue = await webElement.getAttribute("data-tooltip");
  } catch (err) {
    console.log(err.message);
  }
  return webValue;
};

const navigateAndWait = async function (
  webDriver,
  url,
  selector,
  timeout = timeoutMs
) {
  await webDriver.get(url);
  return webDriver.wait(until.elementLocated(By.css(selector)), timeout);
};

const findAndGetText = async function (
  webDriver,
  selector,
  caseInsenstive = false
) {
  let text;
  try {
    let webElements = await webDriver.findElements(By.css(selector));
    if (webElements.length === 1) {
      text = await webElements[0].getText();
    }
    if (caseInsenstive) {
      text = text.toLowerCase();
    }
  } catch (err) {
    console.log(err.message);
  }
  return text;
};

const isTextInDom = function (webDriver, text) {
  return webDriver
    .getPageSource()
    .then((source) => {
      return typeof source === "string" && source.includes(text);
    })
    .catch((err) => {
      throw err;
    });
};

const hasTooltipValue = async function (webDriver, selector, value) {
  let hasValue;
  try {
    let dataValue = await getWebElementTooltip(webDriver, selector);
    hasValue = dataValue === value ? true : false;
  } catch (err) {
    console.log(err.message);
  }
  return hasValue;
};

const findAndClickElement = async function (webDriver, selector) {
  let elements = await getWebElements(webDriver, selector);
  if (elements.length > 0) {
    return elements[0].click();
  }
  return;
};

// New helper function to fix URL domain issue
const findAndDLElement = async function (webDriver, selector) {
  console.log("DL Element selector: ", selector);
  let elements = await getWebElementByCss(webDriver, selector);
  console.log("Found elements :", elements);
  if (elements.length > 0) {
    let oldURL = await elements[0].getAttribute("onclick");
    oldURL = String(oldURL);
    // console.log('oldURL: ', oldURL);
    // old URL syntax: window.location.href="http://192.168.1.110:8080/vmtChat/nativeExport.jsp?channelID=CID:1374769578339&filename=Room_3"
    oldURL = oldURL.substr(22);
    oldURL = oldURL.substring(0, oldURL.length - 1);
    let newURL = oldURL.replace("http://192.168.1.110:8080", baseURL);
    newURL = encodeURI(newURL);
    console.log("Old url parsed: ", oldURL, "; Corrected URL: ", newURL);
    return webDriver.get(newURL);
  }
  return;
};

// New helper function to fix URL domain issue, uses direct URL approach
const findAndDLbyURL = async function (webDriver, roomName, CID) {
  let newURL =
    baseURL +
    "/vmtChat/nativeExport.jsp?channelID=" +
    CID +
    "&filename=" +
    roomName;
  newURL = encodeURI(newURL);
  // console.log("Corrected URL for JNO DL: ", newURL);
  try {
    webDriver.get(newURL);
  } catch (err) {
    console.log(err.message);
  }
  return newURL;
};

// location.href="http://192.168.1.110:8080/vmtChat/logExport?channelID=CID:1430311635466&roomName=vmt math&reportType=1"
const findCSVAndDLbyURL = async function (webDriver, roomName, CID) {
  let newURL =
    baseURL +
    "/vmtChat/logExport?channelID=" +
    CID +
    "&roomName=" +
    roomName +
    "&reportType=1";
  newURL = encodeURI(newURL);
  // console.log("Corrected URL for CSV DL: ", newURL);
  try {
    webDriver.get(newURL);
  } catch (err) {
    console.log(err.message);
  }
  return newURL;
};

const waitForAndClickElement = function (
  webDriver,
  selector,
  timeout = timeoutMs
) {
  return webDriver
    .wait(
      until.elementLocated(By.css(selector)),
      timeout,
      `Unable to locate element by selector: ${selector}`
    )
    .then((locatedEl) => {
      return webDriver
        .wait(
          until.elementIsVisible(locatedEl),
          timeout,
          `Element ${selector} not visible`
        )
        .then((visibleEl) => {
          return visibleEl.click();
        });
    })
    .catch((err) => {
      throw err;
    });
};

const waitForTextInDom = function (webDriver, text, timeout = timeoutMs) {
  return webDriver
    .wait(
      function () {
        return isTextInDom(webDriver, text);
      },
      timeout,
      `Could not find ${text} in DOM`
    )
    .catch((err) => {
      throw err;
    });
};

const waitForSelector = function (webDriver, selector, timeout = timeoutMs) {
  return webDriver
    .wait(until.elementLocated(By.css(selector)), timeout)
    .catch((err) => {
      throw err;
    });
};

const waitForRemoval = async function (
  webDriver,
  selector,
  timeout = timeoutMs
) {
  try {
    return await webDriver.wait(async function () {
      return (await isElementVisible(webDriver, selector)) === false;
    }, timeout);
  } catch (err) {
    if (err.name === "StaleElementReferenceError") {
      // element we are waiting to be removed has already been removed
      return false;
    }
    throw err;
  }
};

const findInputAndType = async function (
  webDriver,
  selector,
  text,
  doHitEnter = false
) {
  try {
    let input = await getWebElements(webDriver, selector);
    if (input.length > 0) {
      await input[0].sendKeys(text);
      if (doHitEnter) {
        return input[0].sendKeys(Key.ENTER);
      }
    }
  } catch (err) {
    console.log(err.message);
  }
  return;
};

const checkSelectorsExist = function (webDriver, selectors) {
  return Promise.all(
    selectors.map((selector) => {
      return isElementVisible(webDriver, selector);
    })
  ).then((selectors) => {
    return selectors.every((x) => x === true);
  });
};

const createSelectors = function (filterOptions) {
  let options = filterOptions.map((item) => {
    return Object.values(item);
  });
  return [].concat.apply([], options);
};

const createFilterList = function (
  isStudent,
  isAdmin,
  filterList,
  removeChildren
) {
  let filterOptions = [...filterList];

  if (removeChildren) {
    filterOptions.forEach((item) => {
      if (item.hasOwnProperty("children")) {
        delete item.children;
      }
    });
  }
  if (isAdmin) {
    filterOptions.forEach((item) => {
      if (item.hasOwnProperty("adminOnly")) {
        delete item.adminOnly;
      }
    });
  }

  if (!isStudent && !isAdmin) {
    filterOptions.forEach((item, i) => {
      if (item.hasOwnProperty("adminOnly")) {
        filterOptions.splice(i, 1);
      }
    });
  }

  if (isStudent) {
    filterOptions = [];
  }

  return filterOptions;
};

const selectOption = async function (webDriver, selector, item, isByCss) {
  try {
    let selectList;
    if (isByCss) {
      selectList = await webDriver.findElement(By.css(selector));
    } else {
      selectList = await webDriver.findElement(By.id(selector));
    }
    await webDriver.sleep(150*slowFactor)
    await selectList.click();
    await webDriver.sleep(350*slowFactor)
    let el = await selectList.findElement(By.css(`option[value="${item}"]`));
    await el.click();
    return el;
  } catch (err) {
    console.log("Select Option error! - ", err.message);
    throw err;
  }
};

const login = async function (webDriver, host, user = admin) {
  await navigateAndWait(webDriver, host, css.topBar.login);
  await findAndClickElement(webDriver, css.topBar.login);

  await waitForSelector(webDriver, css.login.username);
  await findInputAndType(webDriver, css.login.username, user.username);
  await findInputAndType(webDriver, css.login.password, user.password);
  await findAndClickElement(webDriver, css.login.submit);
  return waitForSelector(webDriver, css.topBar.logout);
};

const signup = async function (
  webDriver,
  missingFields = [],
  user = newUser,
  acceptedTerms = true
) {
  const inputs = css.signup.inputs;
  for (let input of Object.keys(inputs)) {
    if (input !== "terms" && !missingFields.includes(input)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        if (input === "organization") {
          // hit enter to select org from dropdown
          // eslint-disable-next-line no-await-in-loop
          await findInputAndType(webDriver, inputs[input], user[input], true);
        } else {
          // eslint-disable-next-line no-await-in-loop
          await findInputAndType(webDriver, inputs[input], user[input]);
        }
      } catch (err) {
        console.log(err.message);
      }
    }
  }
  try {
    if (acceptedTerms) {
      await findAndClickElement(webDriver, inputs.terms);
    }
    await findAndClickElement(webDriver, css.signup.submit);
  } catch (err) {
    console.log(err.message);
  }
};

const clearElement = async function (webDriver, element) {
  let ele;
  try {
    let elements = await getWebElements(webDriver, element);
    ele = elements[0];
    await ele.clear();
  } catch (err) {
    console.log(err.message);
  }
};
const waitForUrlMatch = async function (webDriver, regex, timeout = timeoutMs) {
  try {
    await webDriver.wait(until.urlMatches(regex), timeout);
    return true;
  } catch (err) {
    console.error(`Error waitForUrlMatch: ${err}`);
    console.trace();
    return false;
  }
};

const saveScreenshot = function (webdriver) {
  return webdriver.takeScreenshot().then((base64Data) => {
    let buffer = Buffer.from(base64Data, "base64");
    return sharp(buffer)
      .toFile(path.join(__dirname, "screenshots", `${Date.now()}.png`))
      .catch((err) => {
        console.log(`Error saving screenshot: ${err}`);
      });
  });
};

const waitForNElements = function (
  webDriver,
  selector,
  num,
  timeout = timeoutMs
) {
  let conditionFn = () => {
    return getWebElements(webDriver, selector).then((els) => {
      return els.length === num;
    });
  };
  return webDriver.wait(conditionFn, timeout).catch((err) => {
    throw err;
  });
};

const dismissErrorBox = function (webDriver) {
  let xBtn = css.general.errorBoxDismiss;

  return findAndClickElement(webDriver, xBtn).then(() => {
    return waitForRemoval(webDriver, css.general.errorBox);
  });
};

const waitForAndGetErrorBoxText = function (webDriver) {
  return findAndGetText(webDriver, css.general.errorBoxText);
};

const selectSingleSelectizeItem = function (
  webDriver,
  inputSelector,
  text,
  itemValue,
  options = { willInputClearOnSelect: false }
) {
  let { willInputClearOnSelect, toastText } = options;

  return getWebElementByCss(webDriver, inputSelector)
    .then((selectizeInput) => {
      return selectizeInput.sendKeys(text).then(() => {
        let dataValSelector = `div[data-value="${itemValue}"]`;
        return waitForAndClickElement(webDriver, dataValSelector).then(() => {
          return getParentElement(selectizeInput).then((parentNode) => {
            if (!willInputClearOnSelect) {
              return waitForElementToHaveText(webDriver, parentNode, text);
            }
            if (toastText) {
              return waitForTextInDom(webDriver, toastText);
            }
            return parentNode;
          });
        });
      });
    })
    .catch((err) => {
      throw err;
    });
};

const getWebElementByCss = function (webDriver, selector) {
  // not for testing existence or visibility
  return webDriver.findElement(By.css(selector)).catch((err) => {
    throw err;
  });
};

const waitForElementToHaveText = function (
  webDriver,
  webElOrSelector,
  expectedText,
  timeout
) {
  let conditionFn;
  let isSelector = typeof webElOrSelector === "string";

  if (isSelector) {
    conditionFn = () => {
      return findAndGetText(webDriver, webElOrSelector).then((text) => {
        return text === expectedText;
      });
    };
  } else {
    conditionFn = () => {
      return webElOrSelector.getText().then((val) => {
        return val === expectedText;
      });
    };
  }

  return webDriver.wait(conditionFn, timeout || timeoutMs).catch((err) => {
    throw err;
  });
};

const getParentElement = function (webElement) {
  return webElement.findElement(By.xpath("./..")).catch((err) => {
    throw err;
  });
};

const waitForAttributeToEql = function (
  webDriver,
  webElement,
  attributeName,
  expectedValue,
  timeout = timeoutMs
) {
  let conditionFn = () => {
    return webElement.getAttribute(attributeName).then((attributeVal) => {
      return attributeVal === expectedValue;
    });
  };
  return webDriver.wait(conditionFn, timeout).catch((err) => {
    throw err;
  });
};

const logout = function (webDriver) {
  let loginRegex = new RegExp("/#/auth/login");
  return findAndClickElement(webDriver, css.topBar.logout)
    .then(() => {
      return waitForUrlMatch(webDriver, loginRegex);
    })
    .catch((err) => {
      throw err;
    });
};

const dismissWorkspaceTour = function (webDriver) {
  let xBtnSel = css.workspace.tour.xBtn;
  let overlaySel = css.workspace.tour.overlay;
  return waitForSelector(webDriver, xBtnSel, 1000)
    .then((xBtn) => {
      return xBtn.click().then(() => {
        return waitForRemoval(webDriver, overlaySel);
      });
    })
    .catch((err) => {
      if (err.name === "TimeoutError") {
        // tour box didnt pop up
        return true;
      }
      throw err;
    });
};

const waitForElementsChild = async function (
  webDriver,
  element,
  xpath,
  timeout = timeoutMs
) {
  // console.log({ xpath });
  let conditionFn = () => {
    return element
      .findElements({ xpath })
      .then((els) => {
        if (els.length === 0) {
          // console.log("could not find child: ", xpath);
          return false;
        }
        let el = els[0];
        // console.log("here we are: ", el);
        return el.isDisplayed() ? el : false;
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  return webDriver.wait(conditionFn, timeout).catch((err) => {
    console.log(err.message);
  });
};
const selectOptionByIndex = async function (
  webDriver,
  selector,
  index,
  isByCss
) {
  try {
    let selectList;
    if (isByCss) {
      selectList = await webDriver.findElement(By.css(selector));
    } else {
      selectList = await webDriver.findElement(By.id(selector));
    }
    await selectList.click();
    let els = await selectList.findElements({ css: "> li" });
    console.log(els, "els");
    let el = els[index];
    await el.click();
    return el;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};
//boilerplate setup for running tests by account type
// async function runTests(users) {
//   async function _runTests(user) {
//     const { accountType, actingRole, testDescriptionTitle } = user;
//     describe(`As ${testDescriptionTitle}`, async function() {
//       this.timeout(helpers.timeoutTestMsStr);
//       let driver = null;

//       before(async function() {
//         driver = new Builder()
//           .forBrowser('chrome')
//           .build();
//           await dbSetup.prepTestDb();
//           return await helpers.login(driver, host, user);
//         });

//       after(async function() {
//         return await driver.quit();
//       });
//     });

//TESTS HERE
//   }
//   for (let user of Object.keys(users)) {
//     await _runTests(users[user]);
//   }
// }

module.exports.getWebElements = getWebElements;
module.exports.getWebElementValue = getWebElementValue;
module.exports.getWebElementTooltip = getWebElementTooltip;
module.exports.navigateAndWait = navigateAndWait;
module.exports.isElementVisible = isElementVisible;
module.exports.findAndGetText = findAndGetText;
module.exports.isTextInDom = isTextInDom;
module.exports.hasTooltipValue = hasTooltipValue;
module.exports.findAndClickElement = findAndClickElement;
module.exports.waitForSelector = waitForSelector;
module.exports.findInputAndType = findInputAndType;
module.exports.checkSelectorsExist = checkSelectorsExist;
module.exports.createSelectors = createSelectors;
module.exports.createFilterList = createFilterList;
module.exports.selectOption = selectOption;
module.exports.waitForAndClickElement = waitForAndClickElement;
module.exports.waitForTextInDom = waitForTextInDom;
module.exports.getCurrentUrl = getCurrentUrl;
module.exports.login = login;
module.exports.signup = signup;
module.exports.clearElement = clearElement;
module.exports.waitForRemoval = waitForRemoval;
module.exports.timeoutTestMsStr = timeoutTestMsStr;
module.exports.waitForUrlMatch = waitForUrlMatch;
module.exports.saveScreenshot = saveScreenshot;
module.exports.waitForNElements = waitForNElements;
module.exports.dismissErrorBox = dismissErrorBox;
module.exports.waitForAndGetErrorBoxText = waitForAndGetErrorBoxText;
module.exports.selectSingleSelectizeItem = selectSingleSelectizeItem;
module.exports.getWebElementByCss = getWebElementByCss;
module.exports.waitForElementToHaveText = waitForElementToHaveText;
module.exports.waitForAttributeToEql = waitForAttributeToEql;
module.exports.logout = logout;
module.exports.dismissWorkspaceTour = dismissWorkspaceTour;
module.exports.waitForElementsChild = waitForElementsChild;
module.exports.findAndDLElement = findAndDLElement;
module.exports.findAndDLbyURL = findAndDLbyURL;
module.exports.findCSVAndDLbyURL = findCSVAndDLbyURL;
module.exports.baseURL = baseURL;
module.exports.slowFactor = slowFactor;
