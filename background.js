chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    let extractedURL = request.fromPopup ? request.tabURL : sender.tab.url;
    extractedURL = new URL(extractedURL).hostname;
    console.log(extractedURL);

    if (request.type === "checkboxDetected") {
      chrome.storage.local.get("notificationsEnabled", function(data) {
          if (data.notificationsEnabled) {
              sendCheckboxNotification();
          }
      });
    }
  

    if (request.type === "pdf") {
      handlePDFLink(request.url, function(parsedText) {
          // Use the parsedText to get the summary
          // console.log("Parsed text:", parsedText);
          console.log("url: " + request.url);
          console.log("sectionTitle: " + request.sectionTitle);
          summarizeDocument(parsedText, extractedURL, request.sectionTitle)
          .then(summary => {
            console.log("Summary:", summary);
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
              console.log(`Showing form for ${request.sectionTitle}`);
              console.log(`Sending removePreloader message for ${request.sectionTitle} on ${extractedURL}`);
              removeLoadingSummary(request.sectionTitle, extractedURL);
              chrome.runtime.sendMessage({ type: "removePreloader", summaryName: request.sectionTitle, domain: extractedURL }, function (response) {
                  if (chrome.runtime.lastError) {
                      console.warn(chrome.runtime.lastError.message);
                  }
              });
          });
      });
    } else if (request.type === "updateBadge") {
      let tabId = parseInt(sender.tab.id, 10);
      if (chrome.runtime.lastError) {
        // Tab does not exist, possibly closed
        console.error(chrome.runtime.lastError);
      } else {
        // Tab exists, update the badge
        chrome.action.setBadgeText({ text: request.count.toString(), tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
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
          console.log(`Showing form for ${request.sectionTitle}`);
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
      chrome.runtime.sendMessage({ type: 'showPreloader', summaryName: request.sectionTitle, domain: extractedURL });
      summarizeDocument(request.content, extractedURL, request.sectionTitle)
        .then(summary => {
          sendResponse({ summary: summary });
          storeSummary(extractedURL, summary, request.sectionTitle);
          console.log(`FORM: Sending removePreloader message for ${request.sectionTitle} on ${extractedURL}`);
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
          console.log(`Showing form for ${request.sectionTitle}`);
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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("notificationsEnabled", function(data) {
      if (data.notificationsEnabled === undefined) {
          chrome.storage.local.set({ notificationsEnabled: true });
      }
  });
});


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

function sendCheckboxNotification() {
  chrome.notifications.create('checkboxDetected', {
      type: 'basic',
      iconUrl: 'docdecoderlogo.png', // Replace with the path to your icon
      title: 'Consent Checkbox Detected!',
      message: 'A consent checkbox was detected on the current page. Open the extension to see the summary.'
  });
}


// function fetchPageHTML(url) {
//   return fetch('https://docdecoder.app/gethtml', {
//     method: 'POST',
//     credentials: 'include',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ url: url })
//   })
//     .then(response => response.json())
//     .then(data => data.html);
// }

function handlePDFLink(pdfUrl, callback) {
  fetch('https://docdecoder.app/parsepdf', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: pdfUrl })
  })
  .then(response => response.text())
  .then(parsedText => {
      callback(parsedText);
  })
  .catch(error => {
      console.error("Error processing the PDF:", error);
  });
}

function summarizeDocument(document, url, sectionTitle) {
  let domain = url;

  return new Promise((resolve, reject) => {
    fetch('https://docdecoder.app/summarize', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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
        response.json().then(data => {
          let rateLimitExceededmsg;
          if (data.error === "You've exceeded your summary limit for the FREE plan") {
            rateLimitExceededmsg = `You've exceeded your summary limit for the FREE plan. Please <a id="premium-subscribe-txt-sums" href="#" class="underline">subscribe</a> for unlimited summaries.`;
          } else if (data.error === "You've been rate limited") {
            rateLimitExceededmsg = "Please slow down, you've made too many requests in a short amount of time. Please wait an hour and try again. If you're still seeing this message, please contact us at support@termtrimmer.com.";
          } else {
            rateLimitExceededmsg = "Please slow down, you've made too many requests in a short amount of time. Please wait an hour and try again. If you're still seeing this message, please contact us at support@termtrimmer.com.";
          }
          chrome.storage.local.set({ rateLimitExceeded: rateLimitExceededmsg });
          throw new Error('RateLimitExceeded');
        });
      } else if (response.status === 403) {
        chrome.runtime.sendMessage({ type: "logUserOut" });
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
