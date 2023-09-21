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

  chrome.storage.local.get(['first_name'], function(result) {
    if(result.first_name) {
      document.getElementById('loggedOut').style.display = 'none';
      document.getElementById('loggedIn').style.display = 'block';
      document.getElementById('nameDisplay').textContent = result.first_name;
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
        // console.log(response);
      });
    });
  });

  document.getElementById('signup').addEventListener('click', function() {
    const firstName = document.getElementById('firstName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    fetch('http://3.92.65.153/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        email: email,
        password: password,
      }),
    })
    .then(response => response.json())
    .then(data => {
      if(data.success) {
        document.getElementById('loggedOut').style.display = 'none';
        document.getElementById('loggedIn').style.display = 'block';
        document.getElementById('nameDisplay').textContent = firstName;
        chrome.storage.local.set({first_name: firstName});
        chrome.storage.local.set({token: data.token});
      } else {
        alert(data.message);
      }
    });
  });
  
  document.getElementById('login').addEventListener('click', function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    fetch('http://3.92.65.153/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    })
    .then(response => response.json())
    .then(data => {
      if(data.success) {
        document.getElementById('loggedOut').style.display = 'none';
        document.getElementById('loggedIn').style.display = 'block';
        document.getElementById('nameDisplay').textContent = data.first_name;
        chrome.storage.local.set({first_name: data.first_name});
        chrome.storage.local.set({token: data.token});
      } else {
        alert(data.message);
      }
    });
  });

  document.getElementById('logoutButton').addEventListener('click', function() {
    document.getElementById('loggedIn').style.display = 'none';
    document.getElementById('loggedOut').style.display = 'block';
    chrome.storage.local.remove(['first_name', 'token']);
  });

  document.getElementById('accountButton').addEventListener('click', function() {
    function fetchUserPlan() {
      chrome.storage.local.get(['token'], function(result) {
        const userToken = result.token;
        console.log(userToken);
        fetch(`http://3.92.65.153/get-plan`, {
            headers: {
                'Authorization': userToken,
            }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('current-plan').innerText = data.plan;
            if (data.plan === "FREE") {
                document.getElementById('usage-info').innerText = `You've used ${data.summariesCount} of 10 summaries this month.`;
            }
        })
      });
    }
    fetchUserPlan();

    document.getElementById('main-extension-content').style.display = 'none';
    document.getElementById('plan-info').style.display = 'block';
  });

  document.getElementById('exit-account').addEventListener('click', function() {
    document.getElementById('plan-info').style.display = 'none';
    document.getElementById('main-extension-content').style.display = 'block';
  });

  // Function to show the upgrade modal
  document.getElementById('upgrade-btn').addEventListener('click', function() {
    document.getElementById('upgrade-container').style.display = 'block';
  });

  // Function to hide the upgrade modal
  document.getElementById('close-upgrade').addEventListener('click', function() {
    document.getElementById('upgrade-container').style.display = 'none';
  });

  document.getElementById("monthly").addEventListener("click", function() {
    initiateStripeCheckout("MONTHLY");
  });

  document.getElementById("yearly").addEventListener("click", function() {
      initiateStripeCheckout("YEARLY");
  });
});

function initiateStripeCheckout(plan_type) {
  // Get the token from chrome storage
  chrome.storage.local.get(['token'], function(result) {
      const userToken = result.token;

      // Make an AJAX call to your Flask server to get the Stripe session ID
      fetch('http://3.92.65.153/create-checkout-session', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': userToken // Use the JWT token here
          },
          body: JSON.stringify({plan_type: plan_type})
      })
      .then(response => response.json())
      .then(data => {
          const sessionId = data.id;

          // Send a message to content.js to initiate the Stripe checkout
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              chrome.tabs.sendMessage(tabs[0].id, {
                  action: "startStripeCheckout",
                  sessionId: sessionId
              });
          });

      })
      .catch(error => {
          console.error("Error starting Stripe checkout:", error);
      });
  });
}











// LOOK HERE
// Extra preloader is being added from background.js

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "showPreloader" && message.summaryName && message.domain) {
    addPreloaderForSummary(message.summaryName, message.domain);
    console.log("SHFSDJKFHDJKSFHDKASJLFHASDJKFHASJKDFHASJKLHDJKLHASF")
  } else if (message.type === "removePreloader" && message.summaryName && message.domain) {
    console.log(`Received removePreloader message for ${message.summaryName}`);
    removePreloaderForSummary(message.summaryName, message.domain);
  }
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
      console.log("domain in popup.js: " + currentDomain);

      chrome.storage.local.get('loadingSummaries', function(data) {
        console.log(data.loadingSummaries);
      });

      // Clear the preloader container first
      let preloaderContainer = document.getElementById('preloader-container');
      preloaderContainer.innerHTML = '';

      chrome.storage.local.get(['summaries', 'showForm', 'domainForForm', 'loadingSummaries'], function (result) {
          let summaries = result.summaries || {};
          let domainSummaries = summaries[currentDomain] || {};
          let loadingSummaries = result.loadingSummaries || [];

          // Update the display of the form based on the showForm flag and the domain
          if (result.showForm && result.domainForForm === currentDomain) {
              document.getElementById("errorPrompt").style.display = "block";
          } else {
              document.getElementById("errorPrompt").style.display = "none";
          }

          const blockPatterns = [
              /javascript.+required/i,
              /enable javascript/i,
              /bot detected/i,
          ];

          // Display preloaders for any loading summaries on the current domain only
          chrome.storage.local.get(['loadingSummaries'], function (result) {
            let loadingSummaries = result.loadingSummaries || [];
            loadingSummaries.forEach(loadingSummaryObj => {
              if (loadingSummaryObj.domain === currentDomain) {
                console.log("POPUP.JS: Adding preloader for " + loadingSummaryObj.summaryName + " on " + loadingSummaryObj.domain);
                addPreloaderForSummary(loadingSummaryObj.summaryName, loadingSummaryObj.domain);
              }
            });
          });

          let container = document.getElementById('summaries-container');

          // Dynamically create sections based on available summaries
          for (let termType in domainSummaries) {

              // Only add the summary if it isn't already present
              if (!document.querySelector(`.summary-section[data-summary-name="${termType}"]`)) {
                  let section = document.createElement('div');
                  section.className = "summary-section";  // Added class for identification
                  section.dataset.summaryName = termType;  // Use data attributes to identify summaries

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

                  // Remove the preloader for this summary
                  removePreloaderForSummary(termType, currentDomain);
              }
          }
          // console.log(currentDomain);
          // clearPreloadersForDomain(currentDomain);
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

function toCapitalizedCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function addPreloaderForSummary(summaryName, domain) {
  let container = document.getElementById('preloader-container');

  // Check if preloader for this summaryName already exists for the current domain
  let existingPreloader = document.querySelector(`.preloader-section[data-summary-name="${summaryName}"][data-domain="${domain}"]`);
  if (existingPreloader) {
      return;
  }

  let preloaderSection = document.createElement('div');
  preloaderSection.className = "preloader-section";
  preloaderSection.dataset.summaryName = summaryName;

  // Get the current domain and set it as a data attribute
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      let currentDomain = new URL(tabs[0].url).hostname;
      preloaderSection.setAttribute("data-domain", currentDomain);
      
      let preloader = document.createElement('div');
      preloader.className = "preloader";
      preloaderSection.appendChild(preloader);
  
      let preloaderText = document.createElement('p');
      preloaderText.textContent = `Generating summary for ${summaryName}`;
      preloaderSection.appendChild(preloaderText);
  
      container.appendChild(preloaderSection);
  });
}

function removePreloaderForSummary(summaryName, domain) {
  // console.log(domain)
  let preloaderSection = document.querySelector(`.preloader-section[data-summary-name="${summaryName}"][data-domain="${domain}"]`);
  if (preloaderSection) {
      preloaderSection.remove();
      removeLoadingSummary(summaryName, domain);
  }
}

function clearPreloadersForDomain(url) {
  // let domain = new URL(url).hostname;
  let domain = url;
  console.log("Clearing preloaders for domain: " + domain);

  chrome.storage.local.get(['loadingSummaries'], function(data) {
      let loadingSummaries = data.loadingSummaries || [];

      // Filter out preloaders associated with the current domain
      let updatedSummaries = loadingSummaries.filter(loadingSummaryObj => loadingSummaryObj.domain !== domain);

      // Update storage
      chrome.storage.local.set({ loadingSummaries: updatedSummaries });
  });
}