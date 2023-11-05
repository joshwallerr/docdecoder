chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    let extractedURL;

    if (request.action === "generateSummary" && request.url) {
      extractedURL = new URL(request.url).hostname;
    } else if (request.type === "showPreloader") {
      extractedURL = request.domain;
    } else {
      extractedURL = request.fromPopup ? request.tabURL : sender.tab.url;
      extractedURL = new URL(extractedURL).hostname;
    }

    console.log(extractedURL);

    if (request.type === "checkboxDetected") {
      const domain = new URL(sender.tab.url).hostname;
      // Retrieve both notificationsEnabled and userPlan at the same time
      chrome.storage.local.get(["notificationsEnabled", "userPlan"], function(data) {
          // Check if notifications are enabled and if the user is a paid user
          const isPaidUser = data.userPlan === 'MONTHLY' || data.userPlan === 'YEARLY';
          if (data.notificationsEnabled && isPaidUser) {
              console.log("Sending checkboxDetected notification for paid user");
              sendCheckboxNotification(domain);
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
              console.warn('Error:', error);
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
        console.warn(chrome.runtime.lastError);
      } else {
        // Tab exists, update the badge
        chrome.action.setBadgeText({ text: request.count.toString(), tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      }
    } else if (request.action === "generateSummary" && request.url) {
      fetchPageHTML(request.url).then(pageContent => {
        let sectionTitle = request.policyName;
        let domain = new URL(request.url).hostname;

        // Send the content for summarization
        summarizeDocument(pageContent, domain, sectionTitle)
          .then(summary => {
            sendResponse({ summary: summary });
            storeSummary(extractedURL, summary, sectionTitle);
            chrome.storage.local.get(['loadingSummaries'], function (result) {
              let loadingSummaries = result.loadingSummaries || [];
              loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
              chrome.storage.local.set({ loadingSummaries: loadingSummaries });
            });
          })
          .catch(error => {
            console.warn('Error:', error);
            chrome.runtime.sendMessage({ showForm: true });
            chrome.storage.local.get(['loadingSummaries'], function (result) {
              let loadingSummaries = result.loadingSummaries || [];
              loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
              chrome.storage.local.set({ loadingSummaries: loadingSummaries });
            });
          });
      });
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
          console.warn('Error:', error);
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
          console.warn('Error:', error);
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
      console.log("RECIEVED showPreloader message for" + request.summaryName + " on " + request.domain);
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
  // Check the user plan and set notificationsEnabled accordingly
  chrome.storage.local.get("userPlan", function(data) {
      let defaultNotifications = data.userPlan === 'MONTHLY' || data.userPlan === 'YEARLY';
      chrome.storage.local.set({ notificationsEnabled: defaultNotifications });
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


function sendCheckboxNotification(domain) {
  const message = `A consent label was detected on ${domain}. Open the extension to check for summaries.`;
  chrome.notifications.create('checkboxDetected', {
      type: 'basic',
      iconUrl: 'docdecoderlogo.png', // Replace with the path to your icon
      title: 'Consent Label Detected',
      message: message
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
      console.warn("Error processing the PDF:", error);
  });
}

function summarizeDocument(document, url, sectionTitle) {
  let domain = url;

  // chrome.storage.local.get(['userPlan'], function(data) {
  //   if (data.userPlan && data.userPlan !== "NONE") {
  //       // Existing code to send request for summarization
  //   } else {
  //       console.log("Please log in to use the summarization feature.");
  //   }
  // });

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
          if (data.error === "You've exceeded your monthly summary limit for the FREE plan") {
            rateLimitExceededmsg = `You've exceeded your monthly summary limit for the FREE plan. Please <a id="premium-subscribe-txt-sums" href="#" class="underline">subscribe</a> for unlimited summaries.`;
          } else if (data.error === "You've been rate limited") {
            rateLimitExceededmsg = "Please slow down, you've made too many requests in a short amount of time. Please wait an hour and try again. If you're still seeing this message, please contact us at support@docdecoder.app.";
          } else {
            rateLimitExceededmsg = "Please slow down, you've made too many requests in a short amount of time. Please wait an hour and try again. If you're still seeing this message, please contact us at support@docdecoder.app.";
          }
          chrome.storage.local.set({ rateLimitExceeded: rateLimitExceededmsg });
          chrome.runtime.sendMessage({ type: 'showRateLimitMsg', rateLimitExceeded: rateLimitExceededmsg });
          return Promise.reject('RateLimitExceeded');
        });
      } else if (response.status === 403) {
        chrome.runtime.sendMessage({ type: "logUserOut" });
      } else if (response.status === 400) {
        return response.json().then(data => {
            if (data.error === "Sorry, this policy was too large for our servers to handle. We're working on a solution for this.") {
                return `Sorry, this policy was too large for our servers to handle. We're working on a solution for this.`;
            }
            return Promise.reject('PolicyTooLarge');
        });
    }
      return response.text();  
    })
    .then(data => resolve(data))
    .catch(error => {
      if (error.message === 'RateLimitExceeded') {
        // Return the rate limit error message
        reject("Please slow down, you've made a very high volume of requests in a short amount of time. Please wait an hour and try again. If you're still seeing this message, please contact us at support@docdecoder.app");
      }else if (error.message === "Sorry, this policy was too large for our servers to handle. We're working on a solution for this.") {
        reject(error.message);
      } else {
        reject(error);
      }
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
