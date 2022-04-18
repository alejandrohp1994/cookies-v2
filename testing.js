
/*
chrome.tabs.create(
    {
        "url": url, 
        "selected": true
    });

chrome.windows.getCurrent(getCurrentWindowDetails(win));
*/

function goTo(){
    console.log("click");
    //window.location = (url) 
    window.location.replace(url);
    console.log(window.location);
    chrome.windows.getCurrent(getCurrentWindowDetails(win));
}


function getCurrentWindowDetails(win){
    chrome.tabs.query( 
        {
            'windowId': win.id,
            'active': true
        }, undefined);
    console.log(tab.url);
    console.log(tab.id);
}

var url = "www.bestbuy.com";
goTo();