let keepAliveTimer = null;

function setWaitState() {
    // Check if the timer is already running
    if (keepAliveTimer !== null) return;

    keepAliveTimer = setInterval(() => {
        console.log('Keeping background script active...');
        chrome.runtime.sendMessage({ action: 'heartbeat' });
      }, 10000); // Run every 10 seconds
}

function clearWaitState() {
    if (keepAliveTimer !== null) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
        console.log('Background script can go inactive now.');
    }
}

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
      let sectionTitle = request.policyName;
      let domain = rootDomain(new URL(request.url).hostname);

      handlePDFLink(request.url, domain, sectionTitle, function(error, parsedText) {
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
            chrome.runtime.sendMessage({ showForm: true });
            chrome.storage.local.get(['loadingSummaries'], function (result) {
              let loadingSummaries = result.loadingSummaries || [];
              loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
              chrome.storage.local.set({ loadingSummaries: loadingSummaries });
            });
            sendResponse({ error: 'An error occurred' });
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
        setWaitState();
        summarizeDocument(pageContent, domain, sectionTitle, request.url)
          .then(summary => {
            clearWaitState();
            logMessage(`Summary returning for ${sectionTitle} on ${domain}`);

            sendResponse({ summary: summary });

            logMessage(`Summary returned for ${sectionTitle} on ${domain}`);

            storeSummary(extractedURL, summary, sectionTitle);
            chrome.storage.local.get(['loadingSummaries'], function (result) {
              let loadingSummaries = result.loadingSummaries || [];
              loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
              chrome.storage.local.set({ loadingSummaries: loadingSummaries });
            });
          })
          .catch(error => {
            clearWaitState();
            chrome.runtime.sendMessage({ showForm: true });
            chrome.storage.local.get(['loadingSummaries'], function (result) {
              let loadingSummaries = result.loadingSummaries || [];
              loadingSummaries = loadingSummaries.filter(summary => !(summary.title === sectionTitle && summary.domain === domain));
              chrome.storage.local.set({ loadingSummaries: loadingSummaries });
            });
            sendResponse({ error: 'An error occurred' });
          });
        }).catch(error => {
          clearWaitState();
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


// TESTS
// Popup open, tabbed in [PASSED]
// Popup open, tabbed out [PASSED]
// Popup closed, tabbed in, inactive [FAILED] [PASSED] [PASSED] [PASSED] [FAILED]

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp}: ${message}`;

  // Retrieve existing logs
  chrome.storage.local.get({ logs: [] }, function(result) {
      const logs = result.logs;
      logs.push(logEntry);

      // Store updated logs
      chrome.storage.local.set({ logs: logs }, function() {
          console.log("Log entry added.");
      });
  });
}


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

function handlePDFLink(pdfUrl, domain, sectionTitle, callback) {
  fetch('https://docdecoder.app/parsepdf', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: pdfUrl })
  })
  .then(response => {
      if (!response.ok) {
          throw new Error("We've temporarily disabled support for PDF summarisation whilst we work on a more efficient process for extracting PDF text. We're very sorry for the inconvenience, this feature will be back very soon.");
      }
      return response.text();
  })
  .then(parsedText => {
      console.log("Parsed text: " + parsedText);
      callback(null, parsedText); // First argument is error, which is null in this case
  })
  .catch(error => {
    console.log("Error: " + error);
    handleSummaryError(domain, sectionTitle, error.toString()); // Store the error message
    callback(error, null); // Pass the error to the callback
  });
}




// function fetchPageHTML(url, domain, sectionTitle) {
//   return new Promise((resolve, reject) => {
//     fetch(url)
//       .then(response => {
//         if (!response.ok) {
//           throw new Error('The URL you entered could not be found. Please check the URL and try again.');
//         }
//         return response.text();
//       })
//       .then(text => resolve(text))
//       .catch(error => {
//         handleSummaryError(domain, sectionTitle, error.toString());
//         reject(error);
//       });
//   });
// }



function fetchPageHTML(url, domain, sectionTitle) {
  return new Promise((resolve, reject) => {
    fetch('https://docdecoder.app/fetch_html', { // Replace with your Flask server URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch page HTML. Please check the URL and try again.');
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



function summarizeDocument(document, url, sectionTitle, pageURL) {
  let domain = url;
  logMessage(`Sending summary request for ${sectionTitle} on ${domain}`);

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
        document_type: sectionTitle,
        url: pageURL,
      }),
    })
    .then(response => {
      logMessage(`Summary response received for ${sectionTitle} on ${domain}`);
      if (response.status === 429 || response.status === 403 || response.status === 400 || response.status === 500 || response.status === 502) {
        return response.json().then(data => {
          let message;
          if (response.status === 429) {
            if (data.error === "You've exceeded your monthly summary limit for the FREE plan") {
              message = `You've exceeded your monthly summary limit for the FREE plan. Please <a id="premium-subscribe-txt-sums" href="#" class="underline">subscribe</a> for unlimited summaries.`;
            } else if (data.error === "You've exceeded your monthly summary limit for the PREMIUM plan") {
              message = `You've exceeded your monthly summary limit of 15 for the premium plan.`;
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























chrome.tabs.onActivated.addListener(activeInfo => {
  updateBadgeOnTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateBadgeOnTab(tabId);
  }
});

function updateBadgeOnTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) {
      console.log(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'No tab or URL found');
      return;
    }
    const url = new URL(tab.url);
    const domain = rootDomain(url.hostname);
    checkAndFetchSummaryCount(domain, tabId);
  });
}

function checkAndFetchSummaryCount(domain, tabId) {
  chrome.storage.local.get([domain], function(result) {
    if (result[domain] && new Date().getTime() - result[domain].timestamp < 86400000) { // 86400000 ms = 1 day
      // Data is still valid
      if (result[domain].count > 0) {
        chrome.action.setBadgeText({text: result[domain].count.toString(), tabId: tabId});
        chrome.action.setBadgeBackgroundColor({color: '#22c55e', tabId: tabId});
      } else {
        chrome.action.setBadgeText({text: '', tabId: tabId});
      }
    } else {
      // Data is outdated or not present, fetch new data
      fetchSummaryCount(domain, tabId);
    }
  });
}

function fetchSummaryCount(domain, tabId) {
  fetch('https://docdecoder.app/getsumcount', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain: domain })
  })
  .then(response => response.json())
  .then(data => {
    if (data.summariesCount !== undefined) {
      chrome.storage.local.set({[domain]: {count: data.summariesCount, timestamp: new Date().getTime()}});
      if (data.summariesCount > 0) {
        chrome.action.setBadgeText({text: data.summariesCount.toString(), tabId: tabId});
        chrome.action.setBadgeBackgroundColor({color: '#22c55e', tabId: tabId});
      } else {
        chrome.action.setBadgeText({text: '', tabId: tabId});
      }
    } else {
      chrome.action.setBadgeText({text: '', tabId: tabId});
    }
  })
  .catch(error => {
    console.error('Error fetching summary count:', error);
    chrome.action.setBadgeText({text: '', tabId: tabId});
  });
}

