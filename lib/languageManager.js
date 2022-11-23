var Langswitch = function(allLangs, folder = 'languages'){
	this.language = 'en';
	this.dictionary;
	this.pageTexts = document.getElementsByTagName('l-text');
	this.dictionariesPath = document.URL + (folder === undefined ? '' : folder + '/');
	this.onLanguageChange;

	// Set display none to tags
	var css = 'l-text { display: none; }',
		head = document.head || document.getElementsByTagName('head')[0],
		style = document.createElement('style');
	head.appendChild(style);
	style.type = 'text/css';
	if (style.styleSheet){
		// This is required for IE8 and below.
		style.styleSheet.cssText = css;
	} else {
		style.appendChild(document.createTextNode(css));
	}
}
// Get translated text
Langswitch.prototype.getTranslatedText = function(identifier){
	let word;
	if (this.dictionary){
		if (this.dictionary[identifier] !== undefined){
			word = this.dictionary[identifier];
		} else {
			word = identifier;
		}
	}
	return word;
}
// Translate page texts
Langswitch.prototype.setPageTexts = function(){
	for (let element of this.pageTexts){
		// Find next element
		let nextElement = element.nextElementSibling;
		// If next element = <l-text></ltext> skip it
		if (nextElement){
			while(nextElement.tagName === 'L-TEXT'){
				nextElement = nextElement.nextElementSibling;
			}
		}
		// Translated text
		let translatedText = this.getTranslatedText(element.innerHTML);
		// If there are element atributes
		if (element.attributes.length){
			for (let attribute of element.attributes) {
				if (attribute.nodeName === 'innerhtml'){ // If there is 'innerhtml' attribute in element
					nextElement.innerHTML = translatedText; // Translate next element innerHTML
				} else {
					nextElement.setAttribute(attribute.nodeName, translatedText); // Translate next element attribute
				}
			}
		} else {
			nextElement.innerHTML = translatedText; // Translate next element innerHTML
		}
	}
}
// Set language
Langswitch.prototype.setLanguage = function(language){ // https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
	let requestURL = this.dictionariesPath + language + '.json'; // Request URL
	let request = new XMLHttpRequest(); // XMLHttpRequest
	request.open('GET', requestURL); // Init request
	request.responseType = 'json'; // Set response type to json
	request.send(); // Send request
	request.onload = () => { // On request response
		if (request.response){
			this.dictionary = request.response; // Set dictionary
			this.setPageTexts(); // Apply dictionayry
			document.documentElement.setAttribute('lang', language); // Set document language	
			this.language = language; // Set this.language
			this.onLanguageChange && this.onLanguageChange(language);
			window.localStorage.setItem('language', language);
		} else {
			console.error('JSON file not found or corrupted!\nRequest URL:' + requestURL, request);
		}
	}
	request.onerror = (err) => { // On error
		console.error(err);
	}
}
// Make Langswitch exemplar and set language on page load
var lanwich = new Langswitch(['en', 'ru', 'ua'], 'languages');
window.addEventListener('load', function(){
	let clientLang; // Client language
	if (window.localStorage.getItem('language')){
		clientLang = window.localStorage.getItem('language');
	} else {
		clientLang = navigator.language || navigator.userLanguage;
	}
	lanwich.setLanguage(clientLang);
});