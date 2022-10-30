export default class UserInput {
	#localState; // UserInput state local variable
	#prevLocalState;

	set state(state){
		this.setInputState(state); // Set UserInput state
	}
	get state(){
		return this.#localState; // Return localState variable
	}
	get prevState() {
		return this.#prevLocalState; // Return #prevLocalState
	}

	constructor({ type, id, stateSaving = false, eventName = 'change', initState, callback}) {
		if (type !== 'manualInput') this.element = document.getElementById(id); // Search input in DOM

		switch (type){ // Assign the same types of input realizaton
			case 'color': type = 'text'; break; // Color realizaton is the same to text realization e.t.c...
			case 'range': type = 'number'; break;// /\  /\  /\
		}

		switch (type) { // UserInput type
			// Type checkbox			
			case 'checkbox':
				try { // If there is DOM input with given ID
					if (initState !== undefined){ this.element.checked = initState; }// Set checkox state to given initState. If initState not given, checkbox state = "checked" attribut in HTML
					if (stateSaving){
						// Set checkbox state to saved if there is
						this.element.checked = sessionStorage[id] !== undefined ? sessionStorage[id] !== 'false' : this.element.checked;
					}
					this.#localState = this.element.checked; // Set userInput value
					this.setInputState = (state) => {				
						this.#localState = state; // Set this.#localState equals given 'state'
						this.element.checked = state; // Set the element checked state
						if ( stateSaving ) sessionStorage[id] = this.#localState; // Save the value to 'sessionStorage'
						callback && callback(this.#localState, this); // Run the callback function if given
					}
					// Checkbox event listener ========
					this.element.addEventListener(eventName, ()=>{ this.setInputState(this.element.checked) });
				} catch (err) { // If error
					console.error(err); // Log error message
				}
				break;
			// Type radio				
			case 'radio':
				try { // If there is DOM input with given ID
					if (initState !== undefined){ this.element.querySelector(`input[value="${initState}"]`).checked = true; }// Set radio state to given initState. If initState not given, radio state = "checked" attribut in HTML
					if (stateSaving && sessionStorage[id] !== undefined){ // If value saving is enabled and radio value saved in 'sessionStorage'
						// Set saved radio button
						this.element.querySelector(`input[value="${sessionStorage[id]}"]`).checked = true;
					}
					this.#localState = this.#prevLocalState = this.element.querySelector(`input:checked`).value; // Set userInput value
					this.setInputState = (state) => {
						this.#prevLocalState = this.#localState; // Set previous input state
						state = state.toString();
						this.#localState = state;
						// Set this.#localState selected by the user
						this.element.querySelector(`input[value="${state}"]`).checked = this.#localState;
						// Save user's selection
						if ( stateSaving ) sessionStorage[id] = this.#localState;
						callback && callback(this.#localState, this); // // Run the callback function if given
					}
					// Event listener ========
					this.element.addEventListener(eventName, ()=>{ this.setInputState(this.element.querySelector(`input:checked`).value) });
				} catch (err) { // If error
					console.error(err); // Log error message
				}
				break;
			// Type number				
			case 'number':
				try { // If there is DOM input with given ID
					if (initState !== undefined){ this.element.value = initState; }// Set number value to given initState. If initState not given, number value = "value" attribut in HTML
					if (stateSaving){ // Set saved value if saving is true
						// Set input value to saved
						this.element.value = sessionStorage[id] !== undefined ? sessionStorage[id] : this.element.value;					
					}
					this.#localState = this.#prevLocalState = +this.element.value; // Set userInput value
					this.setInputState = (state) => {
						this.#prevLocalState = this.#localState; // Set previous input state
						this.#localState = +state; // Set this.#localState equals input value
						this.element.value = this.#localState; // Set input value
						if ( stateSaving ) sessionStorage[id] = this.#localState; // Save the value to 'sessionStorage'
						callback && callback(this.#localState, this); // Run the callback function if given
					}
					// Event listener ========
					this.element.addEventListener(eventName, ()=>{ this.setInputState(this.element.value) });		
				} catch (err) { // If error
					console.error(err); // Log error message
				}
				break;
			// Type text				
			case 'text':
				try { // If there is DOM input with given ID
					if (initState !== undefined){ this.element.value = initState; }// Set text value to given initState. If initState not given, text value = "value" attribut in HTML
					if (stateSaving){ // Set saved value if saving is true
						// Set input value to saved
						this.element.value = sessionStorage[id] !== undefined ? sessionStorage[id] : this.element.value;					
					}
					this.#localState = this.#prevLocalState = this.element.value; // Set userInput value
					this.setInputState = (state) => {
						this.#prevLocalState = this.#localState; // Set previous input state
						this.#localState = state; // Set this.#localState equals input value
						this.element.value = this.#localState;
						if ( stateSaving ) sessionStorage[id] = this.#localState; // Save the value to 'sessionStorage'
						callback && callback(this.#localState, this); // Run the callback function if given
					}
					// Event listener ========
					this.element.addEventListener(eventName, ()=>{ this.setInputState(this.element.value) });
				} catch (err) { // If error
					console.error(err); // Log error message
				}
				break;
			case 'manualInput':
					this.#localState = this.#prevLocalState = initState; // Set userInput value
					this.setInputState = (state) => {
						this.#prevLocalState = this.#localState; // Set previous input state
						this.#localState = state; // Set this.#localState equals input value
						if ( stateSaving ) sessionStorage[id] = this.#localState; // Save the value to 'sessionStorage'
						callback && callback(this.#localState, this); // Run the callback function if given
					}				
				break;
			default: console.error("UserInput type: '" + type + "' was not found!");
		}
		callback && callback(this.state, this); // Run the callback function if given
	}
}