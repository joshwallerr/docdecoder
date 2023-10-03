document.addEventListener('DOMContentLoaded', function () {
  initPopup();
  updatePremiumFeaturesVisibility();

  // Event listener to handle storage changes
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
      if (key === "summaries" || key === "showForm" || key === "domainForForm") {
        initPopup();
      }
    }
  });

  chrome.storage.local.get(['first_name'], function (result) {
    if (result.first_name) {
      document.getElementById('loggedOut').style.display = 'none';
      document.getElementById('loggedIn').style.display = 'block';
      const firstName = result.first_name.charAt(0).toUpperCase() + result.first_name.slice(1);
      document.getElementById('nameDisplay').textContent = firstName;
      console.log("first name: " + result.first_name);
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

  document.getElementById('signin-prompt').addEventListener('click', function () {
    document.getElementById('signup-h').style.display = 'none';
    document.getElementById('signin-h').style.display = 'block';
    document.getElementById('firstname-div').style.display = 'none';
    document.getElementById('signin-prompt').style.display = 'none';
    document.getElementById('signup-prompt').style.display = 'block';
    document.getElementById('signup').style.display = 'none';
    document.getElementById('signin').style.display = 'inline-block';
    document.getElementById('resetpword-txt').style.display = 'flex';
  });

  document.getElementById('signup-prompt').addEventListener('click', function () {
    document.getElementById('signup-h').style.display = 'flex';
    document.getElementById('signin-h').style.display = 'none';
    document.getElementById('firstname-div').style.display = 'block';
    document.getElementById('signin-prompt').style.display = 'block';
    document.getElementById('signup-prompt').style.display = 'none';
    document.getElementById('signup').style.display = 'inline-block';
    document.getElementById('signin').style.display = 'none';
    document.getElementById('resetpword-txt').style.display = 'none';
  });

  document.getElementById('resetpword-txt').addEventListener('click', function () {
    document.getElementById('signup-h').style.display = 'none';
    document.getElementById('signin-h').style.display = 'none';
    document.getElementById('firstname-div').style.display = 'none';
    document.getElementById('pword-div').style.display = 'none';
    document.getElementById('signin-prompt').style.display = 'none';
    document.getElementById('signup-prompt').style.display = 'none';
    document.getElementById('signup').style.display = 'none';
    document.getElementById('signin').style.display = 'none';
    document.getElementById('reset-div').style.display = 'block';
    document.getElementById('remembered-prompt').style.display = 'block';
    document.getElementById('remandforgot').style.display = 'none';
    document.getElementById('resetbtn').style.display = 'inline-block';
    document.getElementById('email-label').style.display = 'none';
  });

  document.getElementById('remembered-prompt').addEventListener('click', function () {
    document.getElementById('signin-h').style.display = 'block';
    document.getElementById('pword-div').style.display = 'block';
    document.getElementById('signup-prompt').style.display = 'block';
    document.getElementById('signin').style.display = 'inline-block';
    document.getElementById('reset-div').style.display = 'none';
    document.getElementById('remembered-prompt').style.display = 'none';
    document.getElementById('remandforgot').style.display = 'flex';
    document.getElementById('resetbtn').style.display = 'none';
    document.getElementById('email-label').style.display = 'block';
  });

  document.getElementById('signup').addEventListener('click', function () {
    const firstName = document.getElementById('firstname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('https://docdecoder.app/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        email: email,
        password: password,
      }),
      credentials: 'include',
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.getElementById('loggedOut').style.display = 'none';
        document.getElementById('loggedIn').style.display = 'block';
        const firstname = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        document.getElementById('nameDisplay').textContent = firstname;
        chrome.storage.local.set({ first_name: firstName });

        // Fetch and store userPlan and summariesCount
        fetch('https://docdecoder.app/get-plan', {
          credentials: 'include',
        })
        .then(response => {
          if (response.status === 403) {
            logUserOut();
          }
          return response.json();
        })
          .then(planData => {
            chrome.storage.local.set({ userPlan: planData.plan, summariesCount: planData.summariesCount });
            updatePremiumFeaturesVisibility();
          });
      } else {
        alert(data.message);
      }
    });
  });


  document.getElementById('signin').addEventListener('click', function () {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('https://docdecoder.app/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
      credentials: 'include',
    })
    .then(response => response.json())
      .then(data => {
        if (data.success) {
          document.getElementById('loggedOut').style.display = 'none';
          document.getElementById('loggedIn').style.display = 'block';
          const firstName = data.first_name.charAt(0).toUpperCase() + data.first_name.slice(1);
          document.getElementById('nameDisplay').textContent = firstName;
          chrome.storage.local.set({ first_name: data.first_name });

          // Fetch and store userPlan and summariesCount
          fetch('https://docdecoder.app/get-plan', {
            credentials: 'include',
          })
          .then(response => {
            if (response.status === 403) {
              logUserOut();
            }
            return response.json();
          })
          .then(planData => {
            chrome.storage.local.set({ userPlan: planData.plan, summariesCount: planData.summariesCount });
            updatePremiumFeaturesVisibility();
          });
      } else {
        alert(data.message);
      }
    });
  });

  document.getElementById('logoutButton').addEventListener('click', function () {
    // Make a request to the logout endpoint
    fetch('https://docdecoder.app/logout', {
      method: 'GET',
      credentials: 'include', // Include credentials
    })
      .then(response => {
        if (response.ok) {
          // If logout is successful, update the UI and clear local storage
          logUserOut();
          document.getElementById('plan-info').style.display = 'none';
          document.getElementById('main-extension-content').style.display = 'block';
        } else {
          console.error('Failed to logout');
        }
      })
      .catch(error => {
        console.error('Error during logout:', error);
      });
  });

  document.getElementById('accountButton').addEventListener('click', function () {
    function updateUserAccountInfo() {
      fetch('https://docdecoder.app/get-plan', {
        credentials: 'include',
      })
      .then(response => {
        if (response.status === 403) {
          logUserOut();
        }
        return response.json();
      })
      .then(data => {
        chrome.storage.local.set({userPlan: data.plan, summariesCount: data.summariesCount});

        document.getElementById('current-plan').innerText = data.plan;
        if (data.plan === "FREE") {
          document.getElementById('usage-info').innerHTML = `You've used <span class="font-semibold">${data.summariesCount} of 10</span> summaries this month.`;
          if (data.summariesCount === 10) {
            document.getElementById('upgrade-premium-txt').style.display = 'block';
          }
        } else {
          document.getElementById('usage-info').innerHTML = `You've generated <span class="font-semibold">${data.summariesCount}</span> summaries so far this month.`;
          document.getElementById('upgrade-premium-txt').style.display = 'none';
        }
      })
      .catch(error => {
        console.error('Error updating user account info:', error);
      });
    }
    updateUserAccountInfo();
  
    document.getElementById('main-extension-content').style.display = 'none';
    document.getElementById('plan-info').style.display = 'block';
  });

  document.getElementById('exit-account').addEventListener('click', function () {
    document.getElementById('plan-info').style.display = 'none';
    document.getElementById('main-extension-content').style.display = 'block';
  });

  document.getElementById('upgrade-btn').addEventListener('click', function () {
    document.getElementById('plan-info').style.display = 'none';
    document.getElementById('premium-container').style.display = 'block';
    document.getElementById('exit-premium-container-tomain').style.display = 'none';
    document.getElementById('exit-premium-container-toacct').style.display = 'block';
  });

  document.getElementById("exit-premium-container-toacct").addEventListener("click", function () {
    document.getElementById('plan-info').style.display = 'block';
    document.getElementById('premium-container').style.display = 'none';
  });

  document.getElementById("monthly").addEventListener("click", function () {
    initiateStripeCheckout("MONTHLY");
  });

  document.getElementById("yearly").addEventListener("click", function () {
    initiateStripeCheckout("YEARLY");
  });

  // Make a fetch request to the /get-plan endpoint
  fetch('https://docdecoder.app/get-plan', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  .then(response => {
    if (response.status === 403) {
      logUserOut();
    }
    return response.json();
  })
    .then(data => {
      // Store the received plan and summariesCount in local storage
      chrome.storage.local.set({ userPlan: data.plan, summariesCount: data.summariesCount }, function () {
        // Update the UI based on the user's plan by calling the function
        updatePremiumFeaturesVisibility();
      });
    })
    .catch(error => {
      console.error('Error fetching user plan:', error);
    });

  document.getElementById('manage-subscription-btn').addEventListener('click', function() {
    fetch('https://docdecoder.app/create-portal-session', {
        method: 'POST',
        credentials: 'include',
    })
    .then(response => {
      if (response.status === 403) {
        logUserOut();
      }
      return response.json();
    })
    .then(data => {
        if (data.url) {
            // Redirect the user to the Customer Portal
            window.open(data.url, '_blank');
        } else {
            console.error('Failed to create portal session:', data.error);
        }
    })
    .catch(error => {
        console.error('Error creating portal session:', error);
    });
  });

  document.querySelector('.close-popup-btn').addEventListener('click', function() {
    document.getElementById('aiResponsePopup').style.display = 'none';
  });

  document.getElementById('resetbtn').addEventListener('click', function (e) {
    // Get the email address entered by the user
    const email = document.getElementById('email').value;
  
    // Send a POST request to the server’s /reset-password endpoint with the email address
    fetch('https://docdecoder.app/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    })
    .then((response) => response.json())
    .then((data) => {
      // Handle the server’s response
      if (data.success) {
        alert('Password reset email has been sent! Remember to check your spam folder.');
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch((error) => {
      // Handle errors in sending the request or receiving the response
      console.error('Error:', error);
    });
  });

  document.getElementById('openCreateSummary').addEventListener('click', function() {
    document.getElementById('closeCreateSummary').style.display = 'contents';
    document.getElementById('openCreateSummary').style.display = 'none';
    document.getElementById('createSummaryForm').style.display = 'block';
  });

  document.getElementById('closeCreateSummary').addEventListener('click', function() {
    document.getElementById('closeCreateSummary').style.display = 'none';
    document.getElementById('openCreateSummary').style.display = 'contents';
    document.getElementById('createSummaryForm').style.display = 'none';
  });
  
  const rateLimitMessage = document.getElementById('rateLimitMessage');
  chrome.storage.local.get(['rateLimitExceeded'], function(data) {
    if (data.rateLimitExceeded) {
      rateLimitMessage.style.display = 'block';
      rateLimitMessage.querySelector('p').textContent = data.rateLimitExceeded;
      chrome.storage.local.remove('rateLimitExceeded');
    }
  });

  document.getElementById('premium-button').addEventListener('click', function() {
    document.getElementById('main-extension-content').style.display = 'none';
    document.getElementById('premium-container').style.display = 'block';
    document.getElementById('exit-premium-container-tomain').style.display = 'block';
    document.getElementById('exit-premium-container-toacct').style.display = 'none';
  });
  
  document.getElementById('exit-premium-container-tomain').addEventListener('click', function () {
    document.getElementById('premium-container').style.display = 'none';
    document.getElementById('main-extension-content').style.display = 'block';
  });


  const upgradePremiumTxt = document.getElementById('upgrade-premium-txt');
  const upgradePremiumLink = upgradePremiumTxt.querySelector('a');
  upgradePremiumLink.addEventListener('click', function () {
    document.getElementById('plan-info').style.display = 'none';
    document.getElementById('premium-container').style.display = 'block';
    document.getElementById('exit-premium-container-tomain').style.display = 'none';
    document.getElementById('exit-premium-container-toacct').style.display = 'block';
  });

  document.getElementById('premium-subscribe-txt').addEventListener('click', function () {
    document.getElementById('main-extension-content').style.display = 'none';
    document.getElementById('premium-container').style.display = 'block';
    document.getElementById('exit-premium-container-tomain').style.display = 'block';
    document.getElementById('exit-premium-container-toacct').style.display = 'none';
  });
});

function initiateStripeCheckout(plan_type) {
  // Make an AJAX call to your Flask server to start the checkout
  fetch('https://docdecoder.app/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan_type: plan_type }),
    credentials: 'include',
  })
  .then(response => {
    if (response.status === 403) {
      logUserOut();
    }
    return response.json();
  })
  .then(data => {
    // Open the Stripe Checkout URL in a new tab
    if (data.checkout_url) {
      window.open(data.checkout_url, '_blank');
    } else {
      console.error("Error starting Stripe checkout:", data.error);
    }
  })
  .catch(error => {
    console.error("Error starting Stripe checkout:", error);
  });
}

function updatePremiumFeaturesVisibility() {
  chrome.storage.local.get(['userPlan'], function (result) {
    const userPlan = result.userPlan;
    const isPremiumUser = userPlan === 'MONTHLY' || userPlan === 'YEARLY';

    // Get all AI question form containers by class name
    let aiQuestionFormContainers = document.getElementsByClassName('aiQuestionFormContainer');

    for (let i = 0; i < aiQuestionFormContainers.length; i++) {
      if (isPremiumUser) {
        aiQuestionFormContainers[i].classList.remove('greyed-out');
        // aiQuestionFormContainers[i].removeAttribute('title', 'This is a premium feature. Please subscribe to access it.');
      } else {
        aiQuestionFormContainers[i].classList.add('greyed-out');
        // aiQuestionFormContainers[i].setAttribute('title', 'This is a premium feature. Please subscribe to access it.');
      }
    }

    if (isPremiumUser) {
      document.getElementById('myForm').classList.remove('greyed-out');
      // document.getElementById('myForm').removeAttribute('title');
      document.getElementById('premiumFeatureMessage').style.display = 'none';
      document.getElementById('upgrade-btn').style.display = 'none';
      document.getElementById('manage-subscription-btn').style.display = 'block';
      document.getElementById('premium-button').style.display = 'none';
      document.getElementById('upgrade-premium-txt').style.display = 'none';
    } else {
      document.getElementById('myForm').classList.add('greyed-out');
      // document.getElementById('myForm').setAttribute('title', 'This is a premium feature. Please subscribe to access it.');
      document.getElementById('premiumFeatureMessage').style.display = 'block';
      document.getElementById('upgrade-btn').style.display = 'block';
      document.getElementById('manage-subscription-btn').style.display = 'none';
      document.getElementById('premium-button').style.display = 'block';
    }
  });
}

function logUserOut() {
  document.getElementById('loggedIn').style.display = 'none';
  document.getElementById('loggedOut').style.display = 'block';
  chrome.storage.local.remove(['first_name', 'userPlan', 'summariesCount', 'rateLimitExceeded']);
}






chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.storage.local.get(['domainCheckboxCounts'], function(data) {
    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    const domain = url.hostname;

    const counts = data.domainCheckboxCounts || {};
    const checkboxCount = counts[url] || 'No';

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;

    updateDomainTop(domain);

    updateFavicon(faviconUrl);

    updateCheckboxCount(checkboxCount);
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    chrome.storage.local.get(['domainCheckboxCounts'], function(data) {
      const url = new URL(tab.url);
      const domain = url.hostname;

      const counts = data.domainCheckboxCounts || {};
      const checkboxCount = counts[domain] || 'No';

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;

      updateDomainTop(domain);

      updateFavicon(faviconUrl);


      updateCheckboxCount(checkboxCount);
    });
  }
});

function updateFavicon(faviconUrl) {
  // Update the favicon image in the popup
  const faviconElement = document.getElementById('site-favicon');
  faviconElement.src = faviconUrl;
}

function updateDomainTop(domain) {
  // Update the domain in the popup
  const domainTopElement = document.getElementById('domain-top');
  domainTopElement.textContent = `${domain}`;
}

function updateCheckboxCount(checkboxCount) {
  const checkboxCountElement = document.getElementById('checkbox-count');
  if (checkboxCount === 'No') {
    checkboxCountElement.textContent = `No consent checkboxes detected`;
    checkboxCountElement.classList.add('text-red-500');
  } else if (checkboxCount === 1) {
    checkboxCountElement.textContent = `${checkboxCount} consent checkbox detected`;
    checkboxCountElement.classList.add('text-green-500');

  } else {
    checkboxCountElement.textContent = `${checkboxCount} consent checkboxes detected`;
    checkboxCountElement.classList.add('text-green-500');
  }
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
  } else if (message.type === "logUserOut") {
    logUserOut();
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

    chrome.storage.local.get('loadingSummaries', function (data) {
      console.log(data.loadingSummaries);
    });

    let preloaderContainer = document.getElementById('preloader-container');
    preloaderContainer.innerHTML = '';

    chrome.storage.local.get(['summaries', 'showForm', 'domainForForm', 'loadingSummaries'], function (result) {
      let summaries = result.summaries || {};
      let domainSummaries = summaries[currentDomain] || {};
      let loadingSummaries = result.loadingSummaries || [];

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
      let containerPlaceholder = container.querySelector('#summaries-container-placeholder');

      let accordionCounter = 0;  // Counter to generate unique IDs

      for (let termType in domainSummaries) {
        let policyTitle = document.createElement('h3');
        policyTitle.textContent = toCapitalizedCase(termType);
        policyTitle.className = "text-lg font-semibold mt-4";
        container.appendChild(policyTitle);

        containerPlaceholder.style.display = "none";

        let summaryContent = formatSummaryText(domainSummaries[termType]);
        let parser = new DOMParser();
        let summaryDoc = parser.parseFromString(summaryContent, 'text/html');
        let headings = summaryDoc.querySelectorAll('h4, h5');

        headings.forEach((heading, index) => {
          accordionCounter++;

          // Accordion header
          let accordionHeader = document.createElement('div');
          accordionHeader.className = 'flex flex-row';

          let accordionToggle = document.createElement('a');
          accordionToggle.href = '#';
          accordionToggle.className = 'accordion-toggle w-full flex items-center justify-between';
          accordionToggle.id = 'accordion-toggle-' + accordionCounter;
          accordionToggle.innerHTML = heading.outerHTML + '<img src="chevron-up.png" alt="toggle accordion" class="ml-auto mb-auto w-4 h-4">';

          accordionHeader.appendChild(accordionToggle);
          container.appendChild(accordionHeader);

          // Accordion content
          let contentNode = heading.nextElementSibling;
          let accordionContent = document.createElement('div');
          accordionContent.className = 'mt-2.5';
          accordionContent.style.display = 'none';
          accordionContent.id = 'accordion-content-' + accordionCounter;

          while (contentNode && (contentNode.tagName !== 'H4' && contentNode.tagName !== 'H5')) {
            accordionContent.appendChild(contentNode.cloneNode(true));
            contentNode = contentNode.nextElementSibling;
          }

          container.appendChild(accordionContent);


             // Attach the event listener after appending the accordion to the container
             document.getElementById('accordion-toggle-' + accordionCounter).addEventListener('click', function(event) {
              event.preventDefault();
              let contentId = this.id.replace('toggle', 'content');
              let content = document.getElementById(contentId);
              if (content.style.display === "none" || content.style.display === "") {
                  content.style.display = "block";
                  this.querySelector('img').src = 'chevron-up.png';
                  this.querySelector('img').style.transform = 'rotate(180deg)';
              } else {
                  content.style.display = "none";
                  this.querySelector('img').src = 'chevron-up.png';
                  this.querySelector('img').style.transform = 'rotate(0deg)';
              }
          });

          removePreloaderForSummary(termType, currentDomain);
        });
      }
    });
  });
}


function formatSummaryText(summaryData) {
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

  // Replace newlines with <br> (this might still be useful in some cases)
  text = text.replace(/\n/g, '');

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

  chrome.storage.local.get(['loadingSummaries'], function (data) {
    let loadingSummaries = data.loadingSummaries || [];

    // Filter out preloaders associated with the current domain
    let updatedSummaries = loadingSummaries.filter(loadingSummaryObj => loadingSummaryObj.domain !== domain);

    // Update storage
    chrome.storage.local.set({ loadingSummaries: updatedSummaries });
  });
}