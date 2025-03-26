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

async function waitForElement(selector, timeout = 5000) {
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

async function checkPage() {
    let url = window.location.href;

    if (url.includes("#/jobSearch")) {
        let keywords = await fetchKeyword();
        let jobElements = await waitForJobsToLoad();
        checkAndSelect(keywords, jobElements);
    } else if (url.includes("#/jobDetail")) {
        setTimeout(selectShift, 2000);
    }
}

async function waitForJobsToLoad() {
    return new Promise(resolve => {
        let checkInterval = setInterval(() => {
            let jobElements = document.querySelectorAll("[data-test-id='JobCard']");
            if (jobElements.length > 0) {
                clearInterval(checkInterval);
                resolve(jobElements);
            }
        }, 500);
    });
}

function checkAndSelect(keywords, jobElements) {

    for (let job of jobElements) {
        let jobText = extractTextRecursively(job).toLowerCase();

        for (let keyword of keywords) {
            if (jobText.includes(keyword.toLowerCase())) {
                job.click();

                window.addEventListener("hashchange", function jobDetailListener() {
                    if (window.location.href.includes("#/jobDetail")) {
                        setTimeout(selectShift, 2000);
                        window.removeEventListener("hashchange", jobDetailListener);
                    }
                });

                return;
            }
        }
    }

    setTimeout(() => location.reload(), 3000);
}

function extractTextRecursively(element) {
    return Array.from(element.childNodes)
        .map(node => node.nodeType === Node.TEXT_NODE ? node.textContent : extractTextRecursively(node))
        .join(" ")
        .trim();
}

async function selectShift() {
    try {
        
        let selectOne = [...document.querySelectorAll("*")].find(el => el.textContent.trim() === "Select one");
        if (selectOne) {
            selectOne.click();
        } else {
            return;
        }

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

    } catch (error) {
    }
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
            }
        }
    }, 500);
}

checkPage();
window.addEventListener("hashchange", checkPage);