let notificationSent = false;

function sendNotification() {
  if (!notificationSent) {
    chrome.runtime.sendMessage({ type: "checkboxDetected" });
    notificationSent = true; // Ensure notification is only sent once
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
  // Select all checkboxes on the page.
  let checkboxes = document.querySelectorAll('input[type="checkbox"]');

  // Check if at least one checkbox is present on the page.
  if (checkboxes.length > 0) {
    for (let checkbox of checkboxes) {
      if (!checkbox.checked) {
        let label = document.querySelector(`label[for="${checkbox.id}"]`) || findPotentialLabelForCheckbox(checkbox);
        if (label) {
          sendNotification();
          break; // Exit after finding the first unlabeled checkbox
        }
      }
    }
  }
}

function detectTextConsent() {
  // Scan the page for text containing "by" and "agree".
  const bodyText = document.body.textContent || "";
  const consentPattern = /\bby\b.*?\bagree\b/;
  if (consentPattern.test(bodyText)) {
    sendNotification();
  }
}

// Run immediately on page load
detectCheckboxes();
detectTextConsent();

// Set up an interval to run the function every 5 seconds
let consentCheckInterval = setInterval(() => {
  if (!notificationSent) {
    detectCheckboxes();
    detectTextConsent();
  }
}, 5000);

// Clear the interval after 30 seconds to stop checking
setTimeout(() => {
  clearInterval(consentCheckInterval);
}, 30000);












// FOR SUGGESTED LINKS
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "findLinks") {
        const keywords = ['privacy', 'term', 'return', 'shipping']; // Add more keywords as needed
        let linksMap = {};
        const currentDomain = new URL(window.location.href).hostname;

        // Helper function to check if domains match considering subdomains
        const isDomainMatch = (linkDomain, currentDomain) => {
            return linkDomain.includes(currentDomain) || currentDomain.includes(linkDomain);
        };

        keywords.forEach(keyword => {
            const foundLinks = Array.from(document.querySelectorAll('a')).filter(link => {
                return (link.href.toLowerCase().includes(keyword) || link.innerText.toLowerCase().includes(keyword));
            });

            for (let i = foundLinks.length - 1; i >= 0; i--) {
                const linkDomain = new URL(foundLinks[i].href, window.location.origin).hostname;
                if (isDomainMatch(linkDomain, currentDomain)) {
                    // Store the first link found that matches the domain condition
                    linksMap[keyword] = { href: foundLinks[i].href, text: foundLinks[i].innerText.trim() };
                    break; // Exit the loop once a match is found
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

