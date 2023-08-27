export class TextInput {
	#localState; // UserInputNew state local variable
	#prevLocalState;

	set state(state){
		this.setInputState(state); // Set UserInputNew state
	}
	get state(){
		return this.#localState; // Return localState variable
	}
	get prevState() {
		return this.#prevLocalState; // Return #prevLocalState
	}

	constructor({id, stateSaving = false, eventName = 'change', initState, callback}) {
		this.id = id;
		this.eventName = eventName;
		this.initState = initState;
		this.findElement(); // Set input element

		// Set input value to given initState. If initState not given, input value will be equal "value" attribute in HTML
		if (initState !== undefined){ this.setElemValue(initState); }

		// Set saved value if saving is true
		if (stateSaving){
			// Set input value to saved
			this.setElemValue(sessionStorage[this.id] !== undefined ? this.getFormattedSessionStorage() : this.getElemValue());
		}
		// Set local state parameters
		this.#localState = this.#prevLocalState = this.getElemValue(); // Set userInput value

		// Update input (by event or setting "state" parameter)
		this.setInputState = (state) => {

			// Set previous input state
			this.#prevLocalState = this.#localState;

			// Update local state parameter
			this.#localState = state;

			// Set input value
			this.setElemValue(this.#localState);

			// Save the value to 'sessionStorage'
			if ( stateSaving ) this.setSessionStorage(this.#localState);

			// Run the callback function if given
			callback && callback(this.#localState, this);
		}
		// Event listener
		this.eventListener();

		// Run the callback function if any
		callback && callback(this.state, this);
	}
	// Set input element value
	setElemValue(value){
		this.element.value = value;
	}
	// Get input element value
	getElemValue(){
		return this.element.value;
	}
	// Get processed sessionStorage variable
	getFormattedSessionStorage(){
		return sessionStorage[this.id];
	}
	// Save value to sessionStorage
	setSessionStorage(value){
		sessionStorage[this.id] = this.#localState;
	}
	// Find input element in the DOM
	findElement(){
		this.element = document.getElementById(this.id);
	}
	// Event listener setup
	eventListener(){
		this.element.addEventListener(this.eventName, ()=>{ this.setInputState(this.getElemValue()) });
	}
}

export class NumberInput extends TextInput {
	setElemValue(value){
		this.element.value = +value;
	}
	getElemValue(){
		return +this.element.value;
	}
}

export class CheckboxInput extends TextInput {
	setElemValue(state){
		this.element.checked = state == true;
	}
	getElemValue(){
		return this.element.checked;
	}
	getFormattedSessionStorage(){
		return sessionStorage[this.id] == 'true';
	}
}

export class RadioInput extends TextInput {
	setElemValue(state){
		this.element.querySelector(`input[value="${state}"]`).checked = true;
	}
	getElemValue(){
		return this.element.querySelector(`input:checked`).value;
	}
}

export class  ManualInput extends TextInput {
	eventListener(){ }
	findElement(){ 
		this.element = { value: undefined };
	}
}

export class ColorInput extends TextInput { /* ^_^ */ }

export class RangeInput extends NumberInput { /* ^_^ */ }

export class MassInput extends ManualInput {
	static update = function (){
		document.dispatchEvent(MassInput.inputsUpdate);
	}
	static inputsUpdate = new Event('inputsUpdate');
	wasChanged = false;
	constructor ({id, stateSaving, initState, negativeMassCheckboxParams, onChange, onInput, onUpdate}){
		super({id: id, stateSaving: stateSaving, initState: Math.round(UtilityMethods.getRandomArbitrary(0.5, 100)*10)/10, 
			callback: (state)=>{
				const ths = document.getElementById(id);
				ths.getElementsByClassName('title')[0].innerHTML = Math.round(state*1000)/1000;
			}
		});
		this.elem = document.getElementById(id); // Option item DOM element
		// Negative mass checkbox
		this.negativeMassCheckbox = new CheckboxInput({
			stateSaving: true, 
			callback: (state) => {this.state = state ? -Math.abs(this.state) : Math.abs(this.state)}, 
			...negativeMassCheckboxParams
		});
		this.valueElem = this.elem.getElementsByClassName('mass_input')[0]; // Input range element
		// On Input
		this.valueElem.addEventListener('input', (e)=>{
			this.isInput = true;
			this.state = (Math.pow(Math.pow(this.valueElem.value, 2) / 2 * ( (innerWidth + innerHeight) / 2 / camera.animZoom ), 2)) * (this.negativeMassCheckbox.state ? -1 : 1);
			let menuContainer = document.getElementById('options_menu_container');
			if (!menuContainer.className.includes(" zero_opacity")){
				this.valueElem.closest('.option_item').className += " nozeroopacity";
				menuContainer.className += " zero_opacity";
			}
			this.wasChanged = true;
		});
		// On Change
		const onchanged = () => {
			if (!this.wasChanged) return;
			this.isInput = false;
			let menuContainer = document.getElementById('options_menu_container');
			menuContainer.className = menuContainer.className.replace(" zero_opacity", "");
			this.valueElem.closest('.option_item').className = this.valueElem.closest('.option_item').className.replace(" nozeroopacity", "");
			onChange && onChange(); // Callback
			this.wasChanged = false;
		}

		document.addEventListener('mouseup', onchanged);
		document.addEventListener('touchend', onchanged);
		document.addEventListener('keypress', (e) => { if (e.keyCode == 13) onchanged() } ); // On key enter
		// On Update
		document.addEventListener('inputsUpdate', () => {
			if (!this.isInput){
				this.valueElem.value = Math.pow(scene.getRadiusFromMass(this.state) * camera.animZoom * 2 / ((innerHeight + innerWidth) / 2), 1/2);
			}
		})
	}
}