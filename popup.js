document.addEventListener('DOMContentLoaded', function () {
  initPopup();

  // Event listener to handle storage changes
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
      if (key === "summaries" || key === "showForm" || key === "domainForForm") {
        initPopup();
      }
    }
  });


  document.getElementById('myForm').addEventListener('submit', function (e) {
    e.preventDefault(); // To prevent the form from submitting the usual way

    // Extracting the form data
    let policyName = document.getElementById('policyName').value;
    let policyContent = document.getElementById('policyContent').value;

    // Get the current tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // Sending the form data to background.js
      chrome.runtime.sendMessage({
        content: policyContent, // This is the URL of the current tab
        sectionTitle: policyName,
        tabURL: tabs[0].url, // This is the URL of the current tab
        fromPopup: true // Indicating this message comes from popup
      }, function (response) {
        console.log(response);
      });
    });
  });
});

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("remove-icon")) {
    const domain = event.target.getAttribute("data-domain");
    const sectionTitle = event.target.getAttribute("data-section-title");

    // Remove the summary from Chrome storage
    chrome.storage.local.get(['summaries'], function (result) {
      if (result.summaries && result.summaries[domain]) {
        delete result.summaries[domain][sectionTitle];
        if (Object.keys(result.summaries[domain]).length === 0) {
          delete result.summaries[domain];
        }
        chrome.storage.local.set({ summaries: result.summaries });

        // Remove the summary from the UI
        event.target.parentNode.remove();
      }
    });
  }
});

function initPopup() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let currentDomain = new URL(tabs[0].url).hostname;
    chrome.storage.local.get(['summaries', 'showForm', 'domainForForm'], function (result) {
      let summaries = result.summaries || {};
      let domainSummaries = summaries[currentDomain] || {};

      // Update the display of the form based on the showForm flag and the domain
      if (result.showForm && result.domainForForm === currentDomain) {
        document.getElementById("errorPrompt").style.display = "block";
      } else {
        document.getElementById("errorPrompt").style.display = "none";
      }

      console.log(domainSummaries);  // Log to debug

      const blockPatterns = [
        /javascript.+required/i,
        /enable javascript/i,
        /bot detected/i,
        // ... any other patterns that you find common
      ];

      let container = document.getElementById('summaries-container');
      container.innerHTML = '';  // Clear the container

      // Dynamically create sections based on available summaries
      for (let termType in domainSummaries) {
        let section = document.createElement('div');

        let removeIcon = document.createElement('span');
        removeIcon.textContent = "-";
        removeIcon.className = "remove-icon";
        removeIcon.setAttribute("data-domain", currentDomain);
        removeIcon.setAttribute("data-section-title", termType);
        section.appendChild(removeIcon);

        let heading = document.createElement('h3');
        heading.textContent = toCapitalizedCase(termType);
        section.appendChild(heading);

        if (blockPatterns.some(pattern => pattern.test(domainSummaries[termType]))) {
          let warning = document.createElement('p');
          warning.textContent = "Note: This summary may have failed due to the website's use of CAPTCHAs. If you cannot see the expected summary, please manually create one using the form above.";
          warning.className = "warning";
          section.appendChild(warning);
        }

        let summaryText = document.createElement('p');
        summaryText.innerHTML = formatSummaryText(domainSummaries[termType]);
        section.appendChild(summaryText);

        container.appendChild(section);
      }
    });
  });
}

function formatSummaryText(summaryData) {
  // If it's a string, try to parse it as JSON
  let text = "";
  if (typeof summaryData === 'string') {
    try {
      let parsedData = JSON.parse(summaryData);
      if (parsedData && parsedData.summary) {
        text = parsedData.summary;
      }
    } catch (error) {
      // If parsing fails, treat it as a simple string
      text = summaryData;
    }
  } else if (typeof summaryData === 'object' && summaryData.summary) {
    // If it's already an object, just extract the summary
    text = summaryData.summary;
  }

  // Replace the section headings with h4 wrapped headings
  let headings = ['Breakdown:', 'Key considerations:', 'Things to watch out for:', 'Things to note:'];
  headings.forEach(heading => {
    text = text.replace(heading, `<h4>${heading}</h4>`);
  });

  // Replace newlines with <br>
  text = text.replace(/\n/g, '<br>');

  return text.length > 0 ? text : "Not found";
}

function removeSummary(domain, sectionTitle) {
  // Remove the summary from the UI
  const summaryElem = document.querySelector(`.summary [data-domain="${domain}"][data-section-title="${sectionTitle}"]`);
  if (summaryElem) {
    summaryElem.parentElement.remove();
  }

  // Remove the summary from chrome storage
  chrome.storage.local.get(["summaries"], function (result) {
    if (result.summaries && result.summaries[domain]) {
      delete result.summaries[domain][sectionTitle];
      // If there are no more summaries for this domain, remove the domain key as well
      if (Object.keys(result.summaries[domain]).length === 0) {
        delete result.summaries[domain];
      }
      chrome.storage.local.set({ summaries: result.summaries });
    }
  });
}

function toCapitalizedCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
