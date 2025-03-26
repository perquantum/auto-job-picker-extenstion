async function fetchKeyword() {
    try {
        let response = await fetch(chrome.runtime.getURL("keywords.txt"));
        let text = await response.text();
        let keywords = text.split("\n").map(k => k.trim()).filter(Boolean);
        return keywords;
    } catch (error) {
        return [];
    }
}

async function waitForElement(selector, timeout = 8000) {
    return new Promise((resolve, reject) => {
        let timeElapsed = 0;
        let checkInterval = setInterval(() => {
            let element = document.querySelector(selector);
            if (element) {
                clearInterval(checkInterval);
                resolve(element);
            }
            timeElapsed += 500;
            if (timeElapsed >= timeout) {
                clearInterval(checkInterval);
                reject(`Timeout: Element '${selector}' not found.`);
            }
        }, 500);
    });
}

async function mainLoop() {
    while (true) {
        let url = window.location.href;

        if (url.includes("#/jobSearch")) {
            await handleJobSearchPage();
        } else if (url.includes("#/jobDetail")) {
            await handleJobDetailPage();
        } else if (url.includes("/application")) {
            await handleApplicationPage();
        } else {
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

async function handleJobSearchPage() {
    await waitForElement("[data-test-id='JobCard']");

    let keywords = await fetchKeyword();
    let jobElements = document.querySelectorAll("[data-test-id='JobCard']");
    
    for (let job of jobElements) {
        let jobText = extractTextRecursively(job).toLowerCase();

        for (let keyword of keywords) {
            if (jobText.includes(keyword.toLowerCase())) {
                job.click();
                await waitForUrlChange("#/jobDetail");
                return;
            }
        }
    }

    setTimeout(() => location.reload(), 3000);
}

async function handleJobDetailPage() {
    let selectOne = [...document.querySelectorAll("*")].find(el => el.textContent.trim() === "Select one");
    if (selectOne) {
        selectOne.click();
    } else {
        return;
    }


    await waitForElement("[data-test-id='schedulePanel']");

    let schedulePanel = await waitForElement("[data-test-id='schedulePanel']");
    let shifts = schedulePanel.querySelectorAll("*");

    for (let shift of shifts) {
        let text = extractTextRecursively(shift);
        if (text.includes("$")) {
            let dollarNode = [...shift.childNodes].find(node => 
                node.nodeType === Node.TEXT_NODE && node.textContent.includes("$")
            );

            if (dollarNode) {
                clickOnText(dollarNode);
                await clickApplyButton();
                return;
            }
        }
    }
}

async function handleApplicationPage() {
    let nextButton = [...document.querySelectorAll("button")]
        .find(button => button.textContent.trim() === "Next");

    if (nextButton) {
        nextButton.click();
    }

    let createApplicationButton = [...document.querySelectorAll("button")]
        .find(button => button.textContent.trim() === "Create Application");

    if (createApplicationButton) {
        createApplicationButton.click();
    }
}

async function waitForUrlChange(targetUrlPart, timeout = 10000) {
    return new Promise((resolve, reject) => {
        let timeElapsed = 0;
        let checkInterval = setInterval(() => {
            if (window.location.href.includes(targetUrlPart)) {
                clearInterval(checkInterval);
                resolve();
            }
            timeElapsed += 500;
            if (timeElapsed >= timeout) {
                clearInterval(checkInterval);
                reject(`Timeout: URL did not change to ${targetUrlPart}`);
            }
        }, 500);
    });
}

function extractTextRecursively(element) {
    return Array.from(element.childNodes)
        .map(node => node.nodeType === Node.TEXT_NODE ? node.textContent : extractTextRecursively(node))
        .join(" ")
        .trim();
}

function clickOnText(textNode) {
    let range = document.createRange();
    range.selectNodeContents(textNode);
    let rects = range.getClientRects();

    if (rects.length > 0) {
        let rect = rects[0];
        let x = rect.left + rect.width / 2;
        let y = rect.top + rect.height / 2;

        simulateClick(x, y);
    }
}

function simulateClick(x, y) {
    let event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y
    });

    document.elementFromPoint(x, y)?.dispatchEvent(event);
}

async function clickApplyButton() {
    let checkInterval = setInterval(() => {
        let applyButton = [...document.querySelectorAll("button, *")].find(el => 
            el.textContent.trim() === "Apply"
        );

        if (applyButton) {
            if (!applyButton.disabled) {
                clearInterval(checkInterval);
                applyButton.click();
                waitForUrlChange("#/application");
            }
        }
    }, 500);
}

mainLoop();