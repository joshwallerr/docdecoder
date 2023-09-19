chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    let extractedURL = request.fromPopup ? request.tabURL : sender.tab.url;
    extractedURL = new URL(extractedURL).hostname;
    console.log(extractedURL);

    if (request.type === "updateBadge") {
      let tabId = parseInt(sender.tab.id, 10);
      if (chrome.runtime.lastError) {
        // Tab does not exist, possibly closed
        console.error(chrome.runtime.lastError);
      } else {
        // Tab exists, update the badge
        chrome.action.setBadgeText({ text: request.count.toString(), tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
      }
    } else if (request.url) {
      fetchPageHTML(request.url)
        .then(html => {
          // console.log("Received HTML:", html);
          // console.log("Received URL:", extractedURL);
          // console.log("Received sectionTitle:", request.sectionTitle);
          return summarizeDocument(html, extractedURL, request.sectionTitle);
        })
        .then(summary => {
          sendResponse({ summary: summary });
          storeSummary(extractedURL, summary, request.sectionTitle);
          console.log(`Sending removePreloader message for ${request.sectionTitle} on ${extractedURL}`);
          removeLoadingSummary(request.sectionTitle, extractedURL);
          chrome.runtime.sendMessage({ type: "removePreloader", summaryName: request.sectionTitle, domain: extractedURL }, function (response) {
            if (chrome.runtime.lastError) {
              console.warn(chrome.runtime.lastError.message);
            }
          });
        })
        .catch(error => {
          console.error('Error:', error);
          chrome.runtime.sendMessage({ showForm: true });
          console.log(`Sending removePreloader message for ${request.sectionTitle} on ${extractedURL}`);
          removeLoadingSummary(request.sectionTitle, extractedURL);
          chrome.runtime.sendMessage({ type: "removePreloader", summaryName: request.sectionTitle, domain: extractedURL }, function (response) {
            if (chrome.runtime.lastError) {
              console.warn(chrome.runtime.lastError.message);
            }
          });
        });
    } else if (request.content) {  // New condition to check for policyContent
      // console.log("Received policy content:", request.content);
      summarizeDocument(request.content, extractedURL, request.sectionTitle)
        .then(summary => {
          sendResponse({ summary: summary });
          storeSummary(extractedURL, summary, request.sectionTitle);
          console.log(`Sending removePreloader message for ${request.sectionTitle} on ${extractedURL}`);
          removeLoadingSummary(request.sectionTitle, extractedURL);
          chrome.runtime.sendMessage({ type: "removePreloader", summaryName: request.sectionTitle, domain: extractedURL }, function (response) {
            if (chrome.runtime.lastError) {
              console.warn(chrome.runtime.lastError.message);
            }
          });
        })
        .catch(error => {
          console.error('Error:', error);
          chrome.runtime.sendMessage({ showForm: true });
          console.log(`Sending removePreloader message for ${request.sectionTitle} on ${extractedURL}`);
          removeLoadingSummary(request.sectionTitle, extractedURL);
          chrome.runtime.sendMessage({ type: "removePreloader", summaryName: request.sectionTitle, domain: extractedURL }, function (response) {
            if (chrome.runtime.lastError) {
              console.warn(chrome.runtime.lastError.message);
            }
          });
        });
    } else if (request.showForm) {
      // console.log("Received message to show form");
    } else if (request.type === "showPreloader") {
      // Add the link to loadingSummaries
      let loadingSummaryObj = {
          domain: request.domain,
          summaryName: request.summaryName,
          requestId: request.requestId
      };
      addToLoadingSummaries(loadingSummaryObj);
      console.log(`Sending showPreloader message for ${request.summaryName}`);
      chrome.storage.local.get('loadingSummaries', function(data) {
        console.log("storage from background.js after adding to storage: \n" + data.loadingSummaries);
      });
    }  
    return true;
  }
);

// chrome.webNavigation.onCompleted.addListener(function(details) {
//   // Check if it's the main frame (not an iframe or subframe)
//   if (details.frameId === 0 && details.transitionType === "reload") {
//       clearPreloadersForDomain(details.url);
//   }
// });

// chrome.tabs.onRemoved.addListener(function (tabId) {
//   chrome.action.setBadgeText({ text: "", tabId: tabId });
// });

// chrome.webNavigation.onCompleted.addListener(function (details) {
//   if (details.frameId === 0) {  // Check if it's the main frame
//     chrome.action.setBadgeText({ text: "", tabId: details.tabId });
//   }
// });

function fetchPageHTML(url) {
  return fetch(url)
    .then(response => response.text());
}

function removeLoadingSummary(summaryName, domain) {
  // console.log("removing " + summaryName + " on " + domain);
  chrome.storage.local.get(['loadingSummaries'], function (data) {
      let loadingSummaries = data.loadingSummaries || [];
      let indexToRemove = -1;
      for (let i = 0; i < loadingSummaries.length; i++) {
          if (loadingSummaries[i].summaryName === summaryName && loadingSummaries[i].domain === domain) {
              indexToRemove = i;
              break;
          }
      }
      if (indexToRemove !== -1) {
          loadingSummaries.splice(indexToRemove, 1);
          chrome.storage.local.set({ loadingSummaries: loadingSummaries });
      }
  });
}

// function fetchPageHTML(url) {
//   return fetch('http://3.92.65.153/gethtml', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ url: url })
//   })
//     .then(response => response.json())
//     .then(data => data.html);
// }

function summarizeDocument(document, url, sectionTitle) {
  let domain = url;

  return new Promise((resolve, reject) => {
    // Fetch the token from chrome.storage
    chrome.storage.local.get(['token'], function(result) {
      const userToken = result.token;

      fetch('http://3.92.65.153/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken,
        },
        body: JSON.stringify({
          document: document,
          domain: domain,
          document_type: sectionTitle
        }),
      })
      .then(response => {
        // Check if the status code is 429
        if (response.status === 429) {
          throw new Error('RateLimitExceeded');
        }
        return response.text();
      })
      .then(data => resolve(data))
      .catch(error => {
        if (error.message === 'RateLimitExceeded') {
          // Return the rate limit error message
          reject("Please slow down, you've made too many requests in a short amount of time. Please wait an hour and try again. If you're still seeing this message, please contact us at support@termtrimmer.com.");
        }
        reject(error);  // For other errors, re-throw them so they can be caught and handled by the caller.
      });
    });
  });
}

function storeSummary(url, summary, sectionTitle) {
  let domain = url;
  // get the stored summaries
  chrome.storage.local.get(['summaries'], function (result) {
    let summaries = result.summaries || {};
    if (!summaries[domain]) {
      summaries[domain] = {};
    }
    summaries[domain][sectionTitle] = summary;
    // store the updated summaries
    chrome.storage.local.set({ summaries: summaries });
  });
}

function clearPreloadersForDomain(url) {
  let domain = url;
  // console.log("Clearing preloaders for domain: " + domain);

  chrome.storage.local.get(['loadingSummaries'], function(data) {
      let loadingSummaries = data.loadingSummaries || [];

      // Filter out preloaders associated with the current domain
      let updatedSummaries = loadingSummaries.filter(loadingSummaryObj => loadingSummaryObj.domain !== domain);

      // Update storage
      chrome.storage.local.set({ loadingSummaries: updatedSummaries });
  });
}

function addToLoadingSummaries(loadingSummaryObj) {
  chrome.storage.local.get(['loadingSummaries'], function(data) {
      let loadingSummaries = data.loadingSummaries || [];
      // Check if summary is already in the array
      const existingSummary = loadingSummaries.find(summary => summary.domain === loadingSummaryObj.domain && summary.summaryName === loadingSummaryObj.summaryName);
      if (!existingSummary) {
          loadingSummaries.push(loadingSummaryObj);
          chrome.storage.local.set({ loadingSummaries: loadingSummaries });
      }
  });
}
