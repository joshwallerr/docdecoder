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

let processedCheckboxes = new Set();
console.log(processedCheckboxes);

function detectCheckboxes() {
  let checkboxes = document.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach(checkbox => {
      if (processedCheckboxes.has(checkbox)) {
          return; // Skip checkboxes we've already processed
      }
      processedCheckboxes.add(checkbox); // Add the checkbox to the processed set
      console.log(checkbox);
      
      let label = document.querySelector(`label[for="${checkbox.id}"]`) || findPotentialLabelForCheckbox(checkbox);
      if (label) {
          let labelText = label.textContent.toLowerCase();
          let detectedTermTypes = [];

          if (labelText.includes("terms")) detectedTermTypes.push("terms");
          if (labelText.includes("conditions")) detectedTermTypes.push("conditions");
          if (labelText.includes("privacy")) detectedTermTypes.push("privacy");

          let links = Array.from(label.querySelectorAll('a'));
          if (links.length) {
              links.forEach(link => {
                  let linkText = link.textContent;
                  let termType = detectedTermTypes.find(type => linkText.toLowerCase().includes(type));

                  if (termType) {
                      chrome.runtime.sendMessage({ type: "showNotification", termType: termType });
                      chrome.runtime.sendMessage({ url: link.href, sectionTitle: linkText }, function (response) {
                          console.log(response);
                      });
                  }
              });
          } else if (detectedTermTypes.length) {
              let currentDomain = new URL(window.location.href).hostname;
              chrome.storage.local.set({ showForm: true, domainForForm: currentDomain });
          }
      }
  });
}

// Run immediately on page load
detectCheckboxes();

// Set up an interval to run the function every 5 seconds
let checkboxInterval = setInterval(detectCheckboxes, 5000);

// Clear the interval after 30 seconds
setTimeout(() => {
  clearInterval(checkboxInterval);
}, 30000);
