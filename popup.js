function checkLogin() {
  fetch('https://docdecoder.app/check-login', {
    credentials: 'include',
  })
  .then(response => response.json())
  .then(data => {
    const firstName = data.first_name.charAt(0).toUpperCase() + data.first_name.slice(1);
    document.getElementById('nameDisplay').textContent = firstName;
    document.getElementById('welcomeName').textContent = firstName;
    
    chrome.storage.local.set({ first_name: data.first_name, userPlan: planData.plan, summariesCount: planData.summariesCount });
    updatePremiumFeaturesVisibility();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  checkLogin();
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

  // chrome.storage.local.get(['first_name'], function (result) {
  //   if (result.first_name) {
  //     document.getElementById('loggedOut').style.display = 'none';
  //     document.getElementById('loggedIn').style.display = 'block';
  //     const firstName = result.first_name.charAt(0).toUpperCase() + result.first_name.slice(1);
  //     document.getElementById('nameDisplay').textContent = firstName;
  //     document.getElementById('welcomeName').textContent = firstName;
  //     console.log("first name: " + result.first_name);
  //   }
  // });

  chrome.storage.local.get("notificationsEnabled", function(data) {
    document.getElementById("notifs-toggle").checked = data.notificationsEnabled;
    console.log(data.notificationsEnabled);
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
        console.log("AAAAAAAAAAAAAAAAAAAA" + response);
      });
    });

    // clear input fields
    document.getElementById('policyName').value = '';
    document.getElementById('policyContent').value = '';
  });

  document.getElementById('logoutButton').addEventListener('click', function () {
    logUserOut();
  });

  document.getElementById('accountButton').addEventListener('click', function () {
    // Check if user is logged in
    chrome.storage.local.get('first_name', function(data) {
        if (data.first_name) {
            // User is logged in, proceed with the existing logic
            updateUserAccountInfo();
            document.getElementById('main-extension-content').style.display = 'none';
            document.getElementById('plan-info').style.display = 'block';
        } else {
            // User is not logged in, open a new tab for login page
            chrome.tabs.create({ url: 'https://docdecoder.app/login' });
        }
    });
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

    var aiGif = document.getElementById('ai-gif');
    var customGif = document.getElementById('custom-gif');
    aiGif.src = aiGif.dataset.src;
    customGif.src = customGif.dataset.src;
  });

  document.getElementById("exit-premium-container-toacct").addEventListener("click", function () {
    document.getElementById('plan-info').style.display = 'block';
    document.getElementById('premium-container').style.display = 'none';

    var aiGif = document.getElementById('ai-gif');
    var customGif = document.getElementById('custom-gif');
    aiGif.removeAttribute('src');
    customGif.removeAttribute('src');
  });

  document.getElementById("monthly").addEventListener("click", function () {
    initiateStripeCheckout("MONTHLY");
  });

  document.getElementById("yearly").addEventListener("click", function () {
    initiateStripeCheckout("YEARLY");
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
            console.warn('Failed to create portal session:', data.error);
        }
    })
    .catch(error => {
        console.warn('Error creating portal session:', error);
    });
  });

  document.querySelector('.close-popup-btn').addEventListener('click', function() {
    document.getElementById('aiResponsePopup').style.display = 'none';
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
      rateLimitMessage.querySelector('p').innerHTML = data.rateLimitExceeded;
      chrome.storage.local.remove('rateLimitExceeded');
      document.getElementById('premium-subscribe-txt-sums').addEventListener('click', function () {
        document.getElementById('main-extension-content').style.display = 'none';
        document.getElementById('premium-container').style.display = 'block';
        document.getElementById('exit-premium-container-tomain').style.display = 'block';
        document.getElementById('exit-premium-container-toacct').style.display = 'none';

        var aiGif = document.getElementById('ai-gif');
        var customGif = document.getElementById('custom-gif');
        aiGif.src = aiGif.dataset.src;
        customGif.src = customGif.dataset.src;
      });    
    }
  });

  document.getElementById('premium-button').addEventListener('click', function() {
    document.getElementById('main-extension-content').style.display = 'none';
    document.getElementById('premium-container').style.display = 'block';
    document.getElementById('exit-premium-container-tomain').style.display = 'block';
    document.getElementById('exit-premium-container-toacct').style.display = 'none';

    var aiGif = document.getElementById('ai-gif');
    var customGif = document.getElementById('custom-gif');
    aiGif.src = aiGif.dataset.src;
    customGif.src = customGif.dataset.src;
  });
  
  document.getElementById('exit-premium-container-tomain').addEventListener('click', function () {
    document.getElementById('premium-container').style.display = 'none';
    document.getElementById('main-extension-content').style.display = 'block';

    var aiGif = document.getElementById('ai-gif');
    var customGif = document.getElementById('custom-gif');
    aiGif.removeAttribute('src');
    customGif.removeAttribute('src');
  });


  const upgradePremiumTxt = document.getElementById('upgrade-premium-txt');
  const upgradePremiumLink = upgradePremiumTxt.querySelector('a');
  upgradePremiumLink.addEventListener('click', function () {
    document.getElementById('plan-info').style.display = 'none';
    document.getElementById('premium-container').style.display = 'block';
    document.getElementById('exit-premium-container-tomain').style.display = 'none';
    document.getElementById('exit-premium-container-toacct').style.display = 'block';

    var aiGif = document.getElementById('ai-gif');
    var customGif = document.getElementById('custom-gif');
    aiGif.src = aiGif.dataset.src;
    customGif.src = customGif.dataset.src;
  });

  document.getElementById('premium-subscribe-txt').addEventListener('click', function () {
    document.getElementById('main-extension-content').style.display = 'none';
    document.getElementById('premium-container').style.display = 'block';
    document.getElementById('exit-premium-container-tomain').style.display = 'block';
    document.getElementById('exit-premium-container-toacct').style.display = 'none';

    var aiGif = document.getElementById('ai-gif');
    var customGif = document.getElementById('custom-gif');
    aiGif.src = aiGif.dataset.src;
    customGif.src = customGif.dataset.src;
  });

  document.getElementById('close-intro').addEventListener('click', function () {
    document.getElementById('small-modal').style.display = 'none';
    document.body.style.height = 'auto';
  });

  document.getElementById('helpButton').addEventListener('click', function () {
    document.getElementById('small-modal').style.display = 'flex';
    document.body.style.height = `600px`;
  });

  const toggle = document.getElementById('Toggle1');
  toggle.addEventListener('change', function() {
      if (this.checked) {
          console.log('Toggle set to right');
          document.getElementById('billed-text').textContent = 'billed yearly';
          document.getElementById('premium-price').textContent = '$49.99';
          document.getElementById('monthly').style.display = 'none';
          document.getElementById('yearly').style.display = 'block';
          document.getElementById('slash-term-txt').textContent = '/year';
      } else {
          console.log('Toggle set to Monthly (left)');
          document.getElementById('billed-text').textContent = 'billed monthly';
          document.getElementById('premium-price').textContent = '$4.99';
          document.getElementById('monthly').style.display = 'block';
          document.getElementById('yearly').style.display = 'none';
          document.getElementById('slash-term-txt').textContent = '/month';
      }
  });

  document.getElementById("notifs-toggle").addEventListener("change", function(e) {
    chrome.storage.local.set({ notificationsEnabled: e.target.checked });
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
      console.warn("Error starting Stripe checkout:", data.error);
    }
  })
  .catch(error => {
    console.warn("Error starting Stripe checkout:", error);
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
        aiQuestionFormContainers[i].removeAttribute('title');
      } else {
        aiQuestionFormContainers[i].classList.add('greyed-out');
        aiQuestionFormContainers[i].setAttribute('title', 'This is a premium feature. Please subscribe to access it.');
      }
    }

    chrome.storage.local.get(['summariesCount'], function (result) {
      console.log(result.summariesCount);
      if (result.summariesCount >= 0) {
        if (isPremiumUser) {
          document.getElementById('welcomeContainer').innerHTML = `You've generated <span class="font-semibold">${result.summariesCount}</span> summaries so far this month!`;
        } else if (!isPremiumUser) {
          document.getElementById('welcomeContainer').innerHTML = `You've used <span class="font-semibold">${result.summariesCount}/2</span> summaries this month.`;
        }
        document.getElementById('premium-sumCount').innerHTML = `You've used ${result.summariesCount}/2 summaries this month.`;
      }
    });

    if (isPremiumUser) {
      document.getElementById('myForm').classList.remove('greyed-out');
      document.getElementById('myForm').removeAttribute('title');
      // document.getElementById('myForm').removeAttribute('title');
      document.getElementById('premiumFeatureMessage').style.display = 'none';
      document.getElementById('upgrade-btn').style.display = 'none';
      document.getElementById('manage-subscription-btn').style.display = 'block';
      document.getElementById('premium-button').style.display = 'none';
      document.getElementById('upgrade-premium-txt').style.display = 'none';
    } else {
      document.getElementById('myForm').classList.add('greyed-out');
      document.getElementById('myForm').setAttribute('title', 'This is a premium feature. Please subscribe to access it.');

      // document.getElementById('myForm').setAttribute('title', 'This is a premium feature. Please subscribe to access it.');
      document.getElementById('premiumFeatureMessage').style.display = 'block';
      document.getElementById('upgrade-btn').style.display = 'block';
      document.getElementById('manage-subscription-btn').style.display = 'none';
      document.getElementById('premium-button').style.display = 'block';
    }
  });
}

function logUserOut() {
    fetch('https://docdecoder.app/logout', {
      method: 'GET',
      credentials: 'include', // Include credentials
    })
    .then(response => {
      if (response.ok) {
        console.log('Logged out successfully');
      } else {
        console.warn('Failed to logout');
      }
    })
    .catch(error => {
      console.warn('Error during logout:', error);
    });

    document.getElementById('plan-info').style.display = 'none';
    document.getElementById('main-extension-content').style.display = 'block';
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

    console.log(data.domainCheckboxCounts);
    updateCheckboxCount(checkboxCount);
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    chrome.storage.local.get(['domainCheckboxCounts'], function(data) {
      const url = new URL(tab.url);
      const domain = url.hostname;

      const counts = data.domainCheckboxCounts || {};
      const checkboxCount = counts[url] || 'No';

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;

      updateDomainTop(domain);

      updateFavicon(faviconUrl);

      console.log(data.domainCheckboxCounts);
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
      document.getElementById('usage-info').innerHTML = `You've used <span class="font-semibold">${data.summariesCount} of 2</span> summaries this month.`;
      if (data.summariesCount === 2) {
        document.getElementById('upgrade-premium-txt').style.display = 'block';
      }
    } else {
      document.getElementById('usage-info').innerHTML = `You've generated <span class="font-semibold">${data.summariesCount}</span> summaries so far this month.`;
      document.getElementById('upgrade-premium-txt').style.display = 'none';
    }
  })
  .catch(error => {
    console.warn('Error updating user account info:', error);
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
  } else if (message.type === "logUserOut") {
    logUserOut();
  } else if (message.type === "showRateLimitMsg") {
    const rateLimitMessage = document.getElementById('rateLimitMessage');
    rateLimitMessage.style.display = 'block';
    rateLimitMessage.querySelector('p').innerHTML = message.rateLimitExceeded;
    chrome.storage.local.remove('rateLimitExceeded');
    document.getElementById('premium-subscribe-txt-sums').addEventListener('click', function () {
      document.getElementById('main-extension-content').style.display = 'none';
      document.getElementById('premium-container').style.display = 'block';
      document.getElementById('exit-premium-container-tomain').style.display = 'block';
      document.getElementById('exit-premium-container-toacct').style.display = 'none';

      var aiGif = document.getElementById('ai-gif');
      var customGif = document.getElementById('custom-gif');
      aiGif.src = aiGif.dataset.src;
      customGif.src = customGif.dataset.src;
    });
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
          /captcha/i,
          /blocked/i,
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
        let placeholder = document.getElementById('summaries-container-placeholder').cloneNode(true);

        container.innerHTML = '';
        container.appendChild(placeholder);

        let policyKeys = Object.keys(domainSummaries);
        for (let i = 0; i < policyKeys.length; i++) {
          document.getElementById('summary-section-main').style.borderLeft = "3px solid rgb(34 197 94)";
          let termType = policyKeys[i];

          let policyTitle = document.createElement('h3');
          policyTitle.textContent = toCapitalizedCase(termType);
          policyTitle.className = "text-lg font-semibold mt-5 mb-4";
          container.appendChild(policyTitle);

          if (blockPatterns.some(pattern => pattern.test(domainSummaries[termType]))) {
            let warningDiv = document.createElement('div');
            let warning = document.createElement('p');
            warning.textContent = "Note: This summary may have failed due to the website's use of CAPTCHAs. If you cannot see the expected summary, please manually create one using the form above.";
            warningDiv.className = "mb-4 -mt-2 p-4 bg-red-100";
            warning.className = "m-0";
            warningDiv.appendChild(warning);
            container.appendChild(warningDiv);
          }

          if (domainSummaries[termType].includes("Sorry, this policy was too large for our servers to handle. We're working on a solution for this.")) {
            let tooLargeDiv = document.createElement('div');
            let tooLarge = document.createElement('p');
            tooLarge.textContent = "Sorry, this policy was too large for our servers to handle. We're working on a solution for this.";
            tooLargeDiv.className = "mb-4 -mt-2 p-4 bg-red-100";
            tooLarge.className = "m-0";
            tooLargeDiv.appendChild(tooLarge);
            container.appendChild(tooLargeDiv);
          }

          let summaryContent = formatSummaryText(domainSummaries[termType]);
          console.log("summaryContent: " + summaryContent);
          let parser = new DOMParser();
          let summaryDoc = parser.parseFromString(summaryContent, 'text/html');

          placeholder.style.display = "none";

          let sectionHeaders = summaryDoc.querySelectorAll('h4');
          sectionHeaders.forEach((header) => {
            let clonedHeader = header.cloneNode(true);
            clonedHeader.id += `-${termType}`;

            clonedHeader.classList.add('text-lg', 'font-semibold', 'mt-8');
        
            // New Code: Modify header based on content
            switch (clonedHeader.textContent.toLowerCase()) {
              case 'things to watch out for':
                  clonedHeader.innerHTML = '&#x1F440; ' + clonedHeader.textContent;
                  break;
              case 'ai recommendations':
                  clonedHeader.innerHTML = '&#x1F4A1; ' + clonedHeader.textContent;
                  break;
              case 'faqs':
                  clonedHeader.innerHTML = '&#x1F9E0; Predicted ' + clonedHeader.textContent;
                  break;
              default:
                  break;
            }
            container.appendChild(clonedHeader);

            let sibling = header.nextElementSibling;
            while (sibling && sibling.tagName !== 'H4') {
                let clonedSibling = sibling.cloneNode(true);
                if (clonedSibling.id) {
                    clonedSibling.id += `-${termType}`;
                }
                
                if (clonedSibling.tagName === 'UL' && clonedHeader.id.includes("implications")) {
                  Array.from(clonedSibling.children).forEach((li) => {
                      let iconSrc;
                      switch (li.className) {
                          case 'good': 
                              iconSrc = "good.png";
                              break;
                          case 'bad':
                              iconSrc = "bad.png";
                              break;
                          default:
                              iconSrc = "neutral.png";
                              break;
                      }
                      let iconImg = document.createElement('img');
                      iconImg.src = iconSrc;
                      iconImg.alt = li.className;
                      iconImg.style.marginRight = "8px";  // Add some spacing between icon and text
                      iconImg.classList.add('w-5', 'h-5', 'mb-auto');  // Add the classes to the icon
                      li.insertBefore(iconImg, li.firstChild);
                  });
                }
                container.appendChild(clonedSibling);
                sibling = sibling.nextElementSibling;
              }
          });

          removePreloaderForSummary(termType, currentDomain);

        // New Code: Add a text box and a "send" button for AI questions
        let aiQuestionFormContainer = document.createElement('div');
        aiQuestionFormContainer.className = 'aiQuestionFormContainer';

        let submissionMessageId = `submissionMessage-${i}`; // use loop index to generate unique ID

        let submissionMessage = document.createElement('p');
        submissionMessage.id = submissionMessageId;
        submissionMessage.textContent = 'Submitted successfully, please wait for the response';
        submissionMessage.style.display = 'none'; // Initially hidden
        submissionMessage.className = 'text-sm text-blue-500 mt-2'; // Some styling, adjust as needed
        aiQuestionFormContainer.appendChild(submissionMessage);
        
        let label = document.createElement('label');
        label.setAttribute('for', 'hs-trailing-button-add-on');
        label.className = 'sr-only';
        label.textContent = 'Label';
        aiQuestionFormContainer.appendChild(label);

        let flexContainer = document.createElement('div');
        flexContainer.className = 'flex rounded-md shadow-sm';

        let aiQuestionInput = document.createElement('input');
        aiQuestionInput.type = 'text';
        aiQuestionInput.id = 'hs-trailing-button-add-on';
        aiQuestionInput.name = 'hs-trailing-button-add-on';
        aiQuestionInput.placeholder = 'Ask AI anything about this document';
        aiQuestionInput.className = 'py-3 px-4 block w-full border-gray-200 shadow-sm rounded-l-md text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 bg-gray-100';
        flexContainer.appendChild(aiQuestionInput);

        let sendButton = document.createElement('button');
        sendButton.type = 'button';
        sendButton.textContent = 'Ask';
        sendButton.className = 'py-3 px-4 inline-flex flex-shrink-0 justify-center items-center gap-2 rounded-r-md rounded-l-none border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm';
        sendButton.addEventListener('click', function () {

          let userQuestion = aiQuestionInput.value;
          aiQuestionInput.value = '';

          document.getElementById(submissionMessageId).style.display = 'block';

          fetch('https://docdecoder.app/askai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: userQuestion,
              summaryName: termType,
              domain: currentDomain,
            }),
            credentials: 'include',
          })
          .then(response => response.json())
          .then(data => {
            document.getElementById(submissionMessageId).style.display = 'none';

            if (data.error) {
              alert(data.error);
            } else {
              // Update and show the AI response popup
              document.getElementById('aiResponseText').textContent = data.answer; // Assuming the AI response is in an 'answer' key.
              document.getElementById('aiResponsePopup').style.display = 'block';
            }
          })
          .catch(error => {
            document.getElementById(submissionMessageId).style.display = 'none';

            console.warn('Error asking AI:', error);
          });
        });
        flexContainer.appendChild(sendButton);

        aiQuestionFormContainer.appendChild(flexContainer);
        container.appendChild(aiQuestionFormContainer);

        // Add a horizontal line between policies, but not after the last one
        if (i < policyKeys.length - 1) {
          let horizontalLine = document.createElement('hr');
          horizontalLine.className = "my-4"; // Add some vertical margin for spacing. Adjust as needed.
          container.appendChild(horizontalLine);
        }
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

function sanitize_selector_value(value) {
  // Escapes any double quotes and removes newline characters.
  return value.replace('"', '\\"').replace(/\n/g, '');
}


function addPreloaderForSummary(summaryName, domain) {
  let container = document.getElementById('preloader-container');
    
  let sanitizedSummaryName = sanitize_selector_value(summaryName);
  let sanitizedDomain = sanitize_selector_value(domain);

  let existingPreloader = document.querySelector(`.preloader-section[data-summary-name="${sanitizedSummaryName}"][data-domain="${sanitizedDomain}"]`);
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
  let sanitizedSummaryName = sanitize_selector_value(summaryName);
  let sanitizedDomain = sanitize_selector_value(domain);
  
  let preloaderSection = document.querySelector(`.preloader-section[data-summary-name="${sanitizedSummaryName}"][data-domain="${sanitizedDomain}"]`);
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