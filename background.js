chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.type === "showNotification") {
      // Determine the message based on the detected term
      let notificationMessage = "Open the TermTrimmer extension window for a summary.";
      if (request.sectionTitle) {
        notificationMessage = `A link titled "${request.sectionTitle}" was detected. Open the TermTrimmer extension window for a summary.`;
      }

      // Display the notification to the user
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'detected.jpg',
        title: 'Link Detected',
        message: notificationMessage
      });
    } else if (request.url) {
      fetchPageHTML(request.url)
        .then(html => {
          console.log("Received HTML:", html);
          console.log("Received URL:", sender.tab.url);
          console.log("Received sectionTitle:", request.sectionTitle);
          return summarizeDocument(html, sender.tab.url, request.sectionTitle);
        })
        .then(summary => {
          sendResponse({summary: summary});
          storeSummary(sender.tab.url, summary, request.sectionTitle);
        })
        .catch(error => {
          console.error('Error:', error);
          chrome.runtime.sendMessage({showForm: true});
        });
    } else if (request.userInput) {
      summarizeDocument(request.userInput, sender.tab.url, "User Input") // Using "User Input" as default for this case
        .then(summary => {
          sendResponse({summary: summary});
          storeSummary(sender.tab.url, summary, "User Input");
        })
        .catch(error => {
          console.error('Error:', error);
        });
    } else if (request.showForm) {
      console.log("Received message to show form");
    }
    return true;
  }
);

function fetchPageHTML(url) {
  return fetch(url)
    .then(response => response.text());
}

function summarizeDocument(document, url, sectionTitle) {
  let domain = new URL(url).hostname;
  return fetch('http://3.92.65.153/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document: document, 
      domain: domain,
      document_type: sectionTitle
    }),
  })
  .then(response => response.text());
}

function storeSummary(url, summary, sectionTitle) {
  let domain = new URL(url).hostname;
  // get the stored summaries
  chrome.storage.local.get(['summaries'], function(result) {
    let summaries = result.summaries || {};
    if (!summaries[domain]) {
      summaries[domain] = {};
    }
    summaries[domain][sectionTitle] = summary;
    // store the updated summaries
    chrome.storage.local.set({summaries: summaries});
  });
}
