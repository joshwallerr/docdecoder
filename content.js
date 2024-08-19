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
  let summarizedLinks = JSON.parse(localStorage.getItem('summarizedLinks') || '{}');

  // get chrome.storage.local of auto_summaries, and if it exists, set it to autoSummaries, else set to false
  chrome.storage.local.get(['autoSummaries'], function (result) {
    let autoSummaries = result.autoSummaries || false;
    console.log("Auto summaries: " + autoSummaries);
    keywords.forEach(keyword => {
      const foundLinks = Array.from(document.querySelectorAll('a')).filter(link => {
        return (link.href.toLowerCase().includes(keyword) || link.innerText.toLowerCase().includes(keyword));
      });

      foundLinks.forEach(link => {
        const linkDomain = rootDomain(new URL(link.href, window.location.origin).hostname);
        if (linkDomain === currentDomain) {
          if (!summarizedLinks[link.href] && link.innerText.trim() !== "" && autoSummaries) {
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
      });
    });
  });
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "findLinks") {
      const keywords = ['privacy', 'term', 'return', 'shipping', 'legal', 'cookie']; // Add more keywords as needed
      let linksMap = {};
      const currentDomain = rootDomain(new URL(window.location.href).hostname);

      // Helper function to check if domains match considering subdomains
      const isDomainMatch = (linkDomain, currentDomain) => {
          return linkDomain.includes(currentDomain) || currentDomain.includes(linkDomain);
      };

      keywords.forEach(keyword => {
          const foundLinks = Array.from(document.querySelectorAll('a')).filter(link => {
              return (link.href.toLowerCase().includes(keyword) || link.innerText.toLowerCase().includes(keyword));
          });

          for (let i = foundLinks.length - 1; i >= 0; i--) {
              const linkDomain = rootDomain(new URL(foundLinks[i].href, window.location.origin).hostname);
              if (isDomainMatch(linkDomain, currentDomain)) {
                  linksMap[keyword] = { href: foundLinks[i].href, text: foundLinks[i].innerText.trim() };
                  break;
              }
          }
      });

      let links = Object.keys(linksMap).map(keyword => ({
          keyword: keyword,
          href: linksMap[keyword].href,
          text: linksMap[keyword].text
      }));
      sendResponse({links: links});
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








// Add a route that just takes the domain and returns the summary count for that domain. Then display a badge on the extension icon with the number of summaries for that domain.

// call to docdecoder.app/getsumcount with post and send the domain as the json body
// response will be the number of summaries for that domain, as count
// set the badge text to count

// const currentDomain = rootDomain(new URL(window.location.href).hostname);
// const summaryCountRequestData = {
//   action: "getSummaryCount",
//   domain: currentDomain
// };
// fetch('https://docdecoder.app/getsumcount', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify(summaryCountRequestData)
// })
// .then(response => response.json())
// .then(data => {
//   console.log(data.summariesCount);
//   if (data.summariesCount > 0) {
//     chrome.runtime.sendMessage({badgeText: data.summariesCount.toString()});
//   }
// });