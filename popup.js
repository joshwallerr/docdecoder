document.addEventListener('DOMContentLoaded', function () {

  // Get the current domain
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let currentDomain = new URL(tabs[0].url).hostname;

    // Check if the form should be shown for this domain
    chrome.storage.local.get([currentDomain], function(data) {
        if (data[currentDomain] && data[currentDomain].showForm) {
            document.getElementById("manual-input-form").style.display = "block";
        } else {
            document.getElementById("manual-input-form").style.display = "none";
        }
    });

    document.getElementById('myForm').onsubmit = function (e) {
      e.preventDefault();
      // send the user input to the content script
      chrome.tabs.sendMessage(tabs[0].id, { userInput: document.getElementById('userInput').value }, function (response) {
        console.log(response);
      });

      // Clear the showForm flag for this domain once the user submits the form
      let domainData = {};
      domainData[currentDomain] = { showForm: false };
      chrome.storage.local.set(domainData);
    };

    chrome.storage.local.get(['summaries'], function (result) {
      let summaries = result.summaries || {};
      let domainSummaries = summaries[currentDomain] || {};

      console.log(domainSummaries);  // Log to debug

      let container = document.getElementById('summaries-container');
      container.innerHTML = '';  // Clear the container

      // Dynamically create sections based on available summaries
      for (let termType in domainSummaries) {
        let section = document.createElement('div');

        let heading = document.createElement('h3');
        heading.textContent = toCapitalizedCase(termType);  
        section.appendChild(heading);

        let summaryText = document.createElement('p');
        summaryText.innerHTML = formatSummaryText(domainSummaries[termType]); 
        section.appendChild(summaryText);

        container.appendChild(section);
      }
    });
  });
});

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



function toCapitalizedCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
