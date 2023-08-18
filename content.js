// in the content script
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.userInput) {
      // send the user input to background.js
      chrome.runtime.sendMessage({ userInput: request.userInput }, function (response) {
        console.log(response);
      });
      sendResponse({ message: "User input received" });
    }
  }
);

function findPotentialLabelForCheckbox(checkbox) {
    // Find potential labels for checkboxes without associated label elements
    let potentialLabels = Array.from(document.querySelectorAll('p, div')).filter(el => {
        let text = el.textContent.trim().toLowerCase();
        return text.startsWith("i have read") || text.startsWith("i agree") || text.startsWith("i accept");
    });

    if (potentialLabels.length) {
        return potentialLabels.shift();
    } else {
        return null;
    }
}

// find all the checkboxes on the page
let checkboxes = document.querySelectorAll('input[type="checkbox"]');
console.log(checkboxes);

// Get the current domain
let currentDomain = new URL(window.location.href).hostname;

// check if any of the checkboxes have a label that contains the words "terms", "conditions", "privacy", or "policy"
checkboxes.forEach(checkbox => {
  let label = document.querySelector(`label[for="${checkbox.id}"]`) || findPotentialLabelForCheckbox(checkbox);
  if (label) {
    let labelText = label.textContent.toLowerCase();
    let detectedTermType = null;

    if (labelText.includes("terms")) {
        detectedTermType = "terms";
    } else if (labelText.includes("conditions")) {
        detectedTermType = "conditions";
    } else if (labelText.includes("privacy")) {
        detectedTermType = "privacy";
    }

    if (detectedTermType) {
      // Notify the background script to show the notification
      chrome.runtime.sendMessage({type: "showNotification", termType: detectedTermType});

      // check if the label has a link
      let link = label.querySelector('a');
      if (link) {
        let linkText = link.textContent;
        chrome.runtime.sendMessage({ url: link.href, sectionTitle: linkText }, function (response) {
            console.log(response);
        });
      } else {
        // if there is no link or if the scraping fails, set the flag in storage to show the form in the popup for this domain
        let domainData = {};
        domainData[currentDomain] = { showForm: true };
        chrome.storage.local.set(domainData);
      }
    }
  }
});
