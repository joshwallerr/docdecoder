chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    let extractedURL;

    if (request.action === "generateSummary" || request.action === "pdf") {
      extractedURL = rootDomain(new URL(request.url).hostname);
    } else if (request.type === "showPreloader") {
      extractedURL = request.domain;
    } else {
      extractedURL = request.fromPopup ? request.tabURL : sender.tab.url;
      extractedURL = rootDomain(new URL(extractedURL).hostname);
    }

    console.log(extractedURL);

    if (request.type === "checkboxDetected") {
      const domain = rootDomain(new URL(sender.tab.url).hostname);
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
       
    if (request.action === "pdf" && request.url) {
      handlePDFLink(request.url, function(error, parsedText) {
        if (error) {
          let sectionTitle = request.policyName;
          let domain = rootDomain(new URL(request.url).hostname);
        
          chrome.runtime.sendMessage({ showForm: true });
          chrome.storage.local.get(['loadingSummaries'], function (result) {
            let loadingSummaries = result.loadingSummaries || [];
            loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
            chrome.storage.local.set({ loadingSummaries: loadingSummaries });
          });
          sendResponse({ error: 'An error occurred' });        
        } else {
          let sectionTitle = request.policyName;
          let domain = rootDomain(new URL(request.url).hostname);

          // Send the content for summarization
          summarizeDocument(parsedText, domain, sectionTitle)
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
            sendResponse({ error: 'An error occurred', errorMessage: error.toString() });
          });
        }
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
      let sectionTitle = request.policyName;
      let domain = rootDomain(new URL(request.url).hostname);
      fetchPageHTML(request.url, domain, sectionTitle).then(pageContent => {
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
            chrome.runtime.sendMessage({ showForm: true });
            chrome.storage.local.get(['loadingSummaries'], function (result) {
              let loadingSummaries = result.loadingSummaries || [];
              loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
              chrome.storage.local.set({ loadingSummaries: loadingSummaries });
            });
            sendResponse({ error: 'An error occurred' });
          });
        }).catch(error => {
          chrome.runtime.sendMessage({ showForm: true });
          chrome.storage.local.get(['loadingSummaries'], function (result) {
            let loadingSummaries = result.loadingSummaries || [];
            loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
            chrome.storage.local.set({ loadingSummaries: loadingSummaries });
          });
          sendResponse({ error: 'An error occurred' });        
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

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install") {
    // Set a flag when the extension is installed
    chrome.storage.local.set({ firstInstall: true });
  }
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
      callback(null, parsedText); // First argument is error, which is null in this case
  })
  .catch(error => {
    handleSummaryError(domain, sectionTitle, error); // Store the error message
    reject(error); // Continue with the existing flow
  });
}


function fetchPageHTML(url, domain, sectionTitle) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(text => resolve(text))
      .catch(error => {
        handleSummaryError(domain, sectionTitle, error.toString());
        reject(error);
      });
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
      if (response.status === 429 || response.status === 403 || response.status === 400 || response.status === 500 || response.status === 502) {
        return response.json().then(data => {
          let message;
          if (response.status === 429) {
            if (data.error === "You've exceeded your monthly summary limit for the FREE plan") {
              message = `You've exceeded your monthly summary limit for the FREE plan. Please <a id="premium-subscribe-txt-sums" href="#" class="underline">subscribe</a> for unlimited summaries.`;
            } else {
              message = "Please slow down, you've made too many requests in a short amount of time. Please wait an hour and try again. If you're still seeing this message, please contact us at support@docdecoder.app.";
            }
            // chrome.storage.local.set({ rateLimitExceeded: message });
            // chrome.runtime.sendMessage({ type: 'showRateLimitMsg', rateLimitExceeded: message });
          } else if (response.status === 403) {
            if (data.error) {
              message = `We couldn't authenticate your request, please log in again.`;
            }
            chrome.runtime.sendMessage({ type: "logUserOut" });
          } else if (response.status === 400) {
            if (data.error === "Sorry, this policy was too large for our servers to handle. We're working on a solution for this.") {
              message = `Sorry, this policy was too large for our servers to handle. We're working on a solution for this.`;
            }
          } else if (response.status === 500 || response.status === 502) {
            if (data.error) {
              message = `Sorry, something went wrong. Please try summarising this policy again.`;
            }
          }
          return Promise.reject(message || 'Error');
        });
      } else {
        return response.text();
      }
    })
    .then(data => {
      // On successful summary generation
      clearSummaryError(domain, sectionTitle); // Clear any existing error
      resolve(data); // Continue with the existing flow
    })
    .catch(error => {
      handleSummaryError(domain, sectionTitle, error); // Store the error message
      reject(error); // Continue with the existing flow
    });
  });
}

function clearSummaryError(domain, sectionTitle) {
  chrome.storage.local.get(['summaryErrors'], function (result) {
    let summaryErrors = result.summaryErrors || {};
    if (summaryErrors[domain] && summaryErrors[domain][sectionTitle]) {
      delete summaryErrors[domain][sectionTitle];
      chrome.storage.local.set({ summaryErrors: summaryErrors });
    }
  });
}

function handleSummaryError(domain, sectionTitle, errorMessage) {
  chrome.storage.local.get(['summaryErrors'], function (result) {
    let summaryErrors = result.summaryErrors || {};
    if (!summaryErrors[domain]) {
      summaryErrors[domain] = {};
    }
    summaryErrors[domain][sectionTitle] = errorMessage;
    chrome.storage.local.set({ summaryErrors: summaryErrors });
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

function rootDomain(hostname) {
  // this function was copied from Aaron Peterson on Github: https://gist.github.com/aaronpeterson/8c481deafa549b3614d3d8c9192e3908
  let parts = hostname.split(".");
  if (parts.length <= 2)
      return hostname;

  parts = parts.slice(-3);
  if (['co', 'com'].indexOf(parts[1]) > -1)
      return parts.join('.');

  return parts.slice(-2).join('.');
}