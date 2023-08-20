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
    let detectedTermTypes = [];

    // Check for each term type
    if (labelText.includes("terms")) {
        detectedTermTypes.push("terms");
    } 
    if (labelText.includes("conditions")) {
        detectedTermTypes.push("conditions");
    } 
    if (labelText.includes("privacy")) {
        detectedTermTypes.push("privacy");
    }

    // Check if the label has links
    let links = Array.from(label.querySelectorAll('a'));
    if (links.length) {
      links.forEach(link => {
        let linkText = link.textContent;
        let termType = detectedTermTypes.find(type => linkText.toLowerCase().includes(type)); // find the term type for this link

        if (termType) {
          // Notify the background script to show the notification for each link
          chrome.runtime.sendMessage({type: "showNotification", termType: termType});

          chrome.runtime.sendMessage({ url: link.href, sectionTitle: linkText }, function (response) {
              console.log(response);
          });
        }
      });
    } else if (detectedTermTypes.length) {
      // if there are no links but terms were detected, send a message to show the form in the popup
      chrome.runtime.sendMessage({ showForm: true });
    }
  }
});
