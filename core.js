//RICHIE AND SAM
var str;
var proto;

/** Loads preferences and adds/removes context menu entry. */
var prefs;
var contextMenuId = null;

var chromeContentSettings = chrome.contentSettings;
var chromeInfobars = chrome.infobars;

var currHost = '';

init();

if(chromeContentSettings) {
	var forbiddenOrigin = /(chrome\:\/\/)/g,
		incognito,
		url,
		setting,
		tabId,
		matchForbiddenOrigin;

	chrome.tabs.onUpdated.addListener(
		function(tabId, props, tab) {
		if (props.status == "loading" && tab.selected) {
			getSettings();
		}
	});

	chrome.tabs.onHighlighted.addListener(function () {
		getSettings();
	});
	
	chrome.windows.onFocusChanged.addListener(function() {
		getSettings();
	});

	chrome.windows.getCurrent(function(win) {
		chrome.tabs.query({ 
			'windowId': win.id,
			'active': true }, 
			function() { 
				getSettings(); 
			});
	});

	chrome.browserAction.onClicked.addListener(changeSettings);
	} 
else {
	chrome.browserAction.onClicked.addListener(openLocalCookieSettings.call());

}




function updateIcon(setting) {
		chrome.browserAction.setIcon({path:"./images/cookie_monster-" + setting + ".png"});
}

function refreshNow() {
    var callback = function () {
		chrome.tabs.reload( { bypassCache: true });
    };
    chrome.browsingData.remove(
		{ "origins": [currHost] }, 
		{ "cookies": true }, 
	callback);
}

function getSettings() {
	chrome.tabs.getSelected(undefined, function(tab) {
		incognito = tab.incognito;
		url = tab.url;
		tabId = tab.id;
		
		chromeContentSettings.cookies.get({
			'primaryUrl': url,
			'incognito': incognito },
			function(details) {
				url ? matchForbiddenOrigin = url.match(forbiddenOrigin,'') : matchForbiddenOrigin = true;
				matchForbiddenOrigin ? updateIcon("inactive") : updateIcon(details.setting);				
			});
	});
}

function changeSettings() {
	if (!matchForbiddenOrigin) {
		chromeContentSettings.cookies.get({
			'primaryUrl': url,
			'incognito': incognito },
			
			function(details) {
				setting = details.setting;
				if (setting) {
					var urlParser = new URL(url);
					var pattern = /^file:/.test(url) ? url : (urlParser.hostname + '/*');

					if (!/^file:/.test(url)) {
						pattern = '*://';
						domParts = urlParser.hostname.split('.');
						if (domParts.length > 2) {
							while (domParts.length > 2) {
								domParts.shift();
							}
							pattern += '*.' + domParts.join('.');
						}
						else {
							pattern += urlParser.hostname;
						}
						pattern += ':*';
						pattern += '/*';
					}
					
					currHost = url;
					var newSetting = (setting == 'allow' ? 'block' : 'allow');
					
					chromeContentSettings.cookies.set({
						'primaryPattern': pattern,
						'setting': newSetting,
						'scope': (incognito ? 'incognito_session_only' : 'regular')},
						function() {	
							updateIcon(newSetting);
							setTimeout( refreshNow(), 500);
							setLocalStorageRule(pattern, newSetting);
							}
					);
				}
			});
	}
}

function getLocalStorageRules() {
	return window.localStorage.cookiesTF_rules;
}

function setLocalStorageRule(pattern, newSetting) {
	if (!incognito) {
		var keyExist = false;
		if (rules.length) {
			for(i = 0; i < rules.length; i++) {
				if(pattern == rules[i].primaryPattern) {
					rules[i].setting = newSetting;
					keyExist = true;
					break;
				}
			}
		}
		if (!keyExist) {
			rules.push({
				'primaryPattern': pattern,
				'setting': newSetting,
				'scope': (incognito ? 'incognito_session_only' : 'regular')
			});
		}
		window.localStorage.setItem('cookiesTF_rules',JSON.stringify(rules));
	}
}

function importRules(localStorageRules) {
	var rules = localStorageRules;
	if (rules.length) {
		for(i = 0; i < rules.length; i++) {
			chrome.contentSettings.cookies.set({
				'primaryPattern': rules[i].primaryPattern,
				'setting': rules[i].setting,
				'scope': rules[i].scope });
		}
	}
	window.localStorage.setItem('cookiesTF_rules',JSON.stringify(rules));
}

function clearRules(arg) {
	if (arg == "contentSettings" || arg === undefined) {
		chromeContentSettings.cookies.clear( {
			'scope': (incognito ? 'incognito_session_only' : 'regular')
		});
	}
	if (arg == "localStorage" || arg === undefined) {
		rules = [];
		window.localStorage.setItem('cookiesTF_rules',[]);
	}
}

function getLocalStoragePrefs() {
	
	// cookies_on_off_prefs
	if (!window.localStorage.cookies_on_off_prefs) {
		window.localStorage.cookies_on_off_prefs = JSON.stringify( {
				"showContextMenu": false,
				"autoRefresh": true });
	}
	prefs = JSON.parse(window.localStorage.cookies_on_off_prefs);

	if (!window.localStorage.cookiesTF_rules) {
		clearRules("localStorage");
	} 
	else {
		rules = JSON.parse(window.localStorage.cookiesTF_rules);
	}
}

/** Opens Chrome's Cookie Settings panel */
function openLocalCookieSettings() 
{
	return function(info, tab) { 
		chrome.tabs.create({
			"url": "chrome://settings/cookies", 
			"selected": true
		});
	};
}

function toggleContextMenu() {
	if (prefs.showContextMenu && !contextMenuId) {
		contextMenuId = chrome.contextMenus.create({
			"title" : "Settings -> Cookie exceptions",
			"type" : "normal",
			"contexts" : ["all"],
			"onclick" : openLocalCookieSettings()
		});		
	}
	if (!prefs.showContextMenu && contextMenuId) {		
		chrome.contextMenus.remove(contextMenuId);
		contextMenuId = null;		
	}

}


function init() 
{
	getLocalStoragePrefs();
	toggleContextMenu();
}