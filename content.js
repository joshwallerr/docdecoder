chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.userInput) {
            // send the user input to background.js
            chrome.runtime.sendMessage({ userInput: request.userInput }, function (response) {
                // console.log(response);
            });
            sendResponse({ message: "User input received" });
        }
    }
);

let notificationSent = false;

function findPotentialLabelForCheckbox(checkbox) {
    let potentialLabels = Array.from(document.querySelectorAll('p, div')).filter(el => {
        let text = el.textContent.trim().toLowerCase();
        return (text.startsWith("i ") || text.startsWith("you ")) && (text.includes("read") || text.includes("agree") || text.includes("accept") || text.includes("understand") || text.includes("acknowledge") || text.includes("consent") || text.includes("confirm") || text.includes("i have"));
    });

    if (potentialLabels.length) {
        return potentialLabels.shift();
    } else {
        return null;
    }
}

let processedCheckboxes = new Set();
// console.log(processedCheckboxes);

let count = 0;

function detectCheckboxes() {
    let allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    
    // If more than 5 checkboxes are detected, narrow down the selection
    let checkboxes = (allCheckboxes.length > 5) 
                     ? document.querySelectorAll('form input[type="checkbox"]')
                     : allCheckboxes;

    checkboxes.forEach(checkbox => {
        if (processedCheckboxes.has(checkbox)) {
            return; // Skip checkboxes we've already processed
        }
        processedCheckboxes.add(checkbox); // Add the checkbox to the processed set
        console.log(checkbox);

        if (!notificationSent) {
            chrome.runtime.sendMessage({ type: "checkboxDetected" });
            notificationSent = true;
        }        

        let label = document.querySelector(`label[for="${checkbox.id}"]`) || findPotentialLabelForCheckbox(checkbox);
        if (label) {
            let links = Array.from(label.querySelectorAll('a'));
            if (links.length) {
                links.forEach(link => {
                    let linkText = link.textContent;
                    // console.log(linkText);

                    if (linkText) {
                        count++;

                        chrome.runtime.sendMessage({ type: "updateBadge", count: count });

                        let currentDomain = new URL(window.location.href).hostname;
                        let currentPage = window.location.href;
                        
                        chrome.storage.local.get(['domainCheckboxCounts'], function(data) {
                            let counts = data.domainCheckboxCounts || {};
                            
                            // Update the count for the current domain
                            counts[currentPage] = count;
                    
                            // Store the updated counts object
                            chrome.storage.local.set({ domainCheckboxCounts: counts });
                        });
                    
                        chrome.runtime.sendMessage({
                            type: "showPreloader",
                            summaryName: linkText,
                            domain: currentDomain,
                            requestId: Date.now()
                        });

                        console.log(`Sending showPreloader message for ${linkText} on ${currentDomain}`);
                        
                        console.log(link.href);

                        let linkHref = link.href;
                        if (linkHref.toLowerCase().endsWith('.pdf')) {
                            // This is a PDF link
                            chrome.runtime.sendMessage({ url: linkHref, type: 'pdf', sectionTitle: linkText }, function (response) {});
                        } else {
                            chrome.runtime.sendMessage({ url: link.href, sectionTitle: linkText }, function (response) {});
                        }
                    }
                });
            } else {
                let currentDomain = new URL(window.location.href).hostname;
                chrome.storage.local.set({ showForm: true, domainForForm: currentDomain });
            }
        }
    });
}

// Run immediately on page load
detectCheckboxes();

// Set up an interval to run the function every 5 seconds
let checkboxInterval = setInterval(detectCheckboxes, 5000);

// Clear the interval after 30 seconds
setTimeout(() => {
    clearInterval(checkboxInterval);
}, 30000);






// FOR SUGGESTED LINKS
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "findLinks") {
        const keywords = ['privacy', 'term', 'return', 'shipping']; // Add more keywords as needed
        let linksMap = {};
        const currentDomain = new URL(window.location.href).hostname;

        // Helper function to check if domains match considering subdomains
        const isDomainMatch = (linkDomain, currentDomain) => {
            return linkDomain.includes(currentDomain) || currentDomain.includes(linkDomain);
        };

        keywords.forEach(keyword => {
            const foundLinks = Array.from(document.querySelectorAll('a')).filter(link => {
                return (link.href.toLowerCase().includes(keyword) || link.innerText.toLowerCase().includes(keyword));
            });

            for (let i = foundLinks.length - 1; i >= 0; i--) {
                const linkDomain = new URL(foundLinks[i].href, window.location.origin).hostname;
                if (isDomainMatch(linkDomain, currentDomain)) {
                    // Store the first link found that matches the domain condition
                    linksMap[keyword] = { href: foundLinks[i].href, text: foundLinks[i].innerText.trim() };
                    break; // Exit the loop once a match is found
                }
            }
        });

        let links = Object.keys(linksMap).map(keyword => ({
            keyword: keyword,
            href: linksMap[keyword].href,
            text: linksMap[keyword].text
        }));
        sendResponse({links: links});
    }
});

