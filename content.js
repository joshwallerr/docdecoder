let notificationSent = false;

function sendNotification() {
  if (!notificationSent) {
    chrome.runtime.sendMessage({ type: "checkboxDetected" });
    notificationSent = true;
  }
}

function findPotentialLabelForCheckbox(checkbox) {
  let potentialLabels = Array.from(document.querySelectorAll('p, div')).filter(el => {
    let text = el.textContent.trim().toLowerCase();
    return (text.startsWith("i ") || text.startsWith("you ")) && (text.includes("read") || text.includes("agree") || text.includes("accept") || text.includes("understand") || text.includes("acknowledge") || text.includes("consent") || text.includes("confirm") || text.includes("i have"));
  });

  if (potentialLabels.length) {
    return potentialLabels.shift();
  } else {
    return null;
  }
}

function detectCheckboxes() {
  let checkboxes = document.querySelectorAll('input[type="checkbox"]');
  if (checkboxes.length > 0) {
    for (let checkbox of checkboxes) {
      if (!checkbox.checked) {
        let label = document.querySelector(`label[for="${checkbox.id}"]`) || findPotentialLabelForCheckbox(checkbox);
        if (label) {
          sendNotification();
          break;
        }
      }
    }
  }
}

function detectTextConsent() {
  const bodyText = document.body.textContent || "";
  const consentPattern = /\bby\b.*?\bagree\b/;
  if (consentPattern.test(bodyText)) {
    sendNotification();
  }
}


function displayPreloader(sectionTitle, domain) {
  chrome.storage.local.get(['loadingSummaries'], function (result) {
    let loadingSummaries = result.loadingSummaries || [];
    loadingSummaries.push({ title: sectionTitle, domain: domain });
    chrome.storage.local.set({ loadingSummaries: loadingSummaries });

    console.log("Displaying preloader for " + sectionTitle);
  });
}



function handlePolicyLinks() {
  const keywords = ['privacy', 'terms', 'return', 'shipping', 'legal', 'cookie'];
  const currentDomain = rootDomain(new URL(window.location.href).hostname);
  let linksMap = {};
  let summarizedLinks = JSON.parse(localStorage.getItem('summarizedLinks') || '{}');

  // get chrome.storage.local of auto_summaries, and if it exists, set it to autoSummaries, else set to false
  chrome.storage.local.get(['autoSummaries'], function (result) {
    let autoSummaries = result.autoSummaries || false;
    if (autoSummaries) {
      keywords.forEach(keyword => {
        const foundLinks = Array.from(document.querySelectorAll('a')).filter(link => {
          return (link.href.toLowerCase().includes(keyword) || link.innerText.toLowerCase().includes(keyword));
        });

        foundLinks.forEach(link => {
          const linkDomain = rootDomain(new URL(link.href, window.location.origin).hostname);
          if (linkDomain === currentDomain) {
            if (!linksMap[keyword]) {
              linksMap[keyword] = { href: link.href, text: link.innerText.trim() };

              if (!summarizedLinks[link.href] && link.innerText.trim() !== "") {
                const summaryRequestData = {
                  action: "generateSummary",
                  url: link.href,
                  policyName: link.innerText.trim()
                };
                chrome.runtime.sendMessage(summaryRequestData);
                displayPreloader(link.innerText.trim(), currentDomain);
                console.log("Sent summary request for " + link.innerText.trim());
                summarizedLinks[link.href] = true;
                localStorage.setItem('summarizedLinks', JSON.stringify(summarizedLinks));
              }
            }
          }
        });
      });
    }
  });


  if (Object.keys(linksMap).length > 0) {
    return Object.values(linksMap);
  } else {
    return [];
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "findLinks") {
    const links = handlePolicyLinks();
    sendResponse({ links: links });
    return true;
  }
});

detectCheckboxes();
detectTextConsent();
handlePolicyLinks();

let consentCheckInterval = setInterval(() => {
  if (!notificationSent) {
    detectCheckboxes();
    detectTextConsent();
  }
}, 5000);

setTimeout(() => {
  clearInterval(consentCheckInterval);
}, 30000);

function rootDomain(hostname) {
  let parts = hostname.split(".");
  if (parts.length <= 2)
    return hostname;

  parts = parts.slice(-3);
  if (['co', 'com'].indexOf(parts[1]) > -1)
    return parts.join('.');

  return parts.slice(-2).join('.');
}




// works now, but only one preloader is showing at a time. Not huge deal, but should be fixed eventually