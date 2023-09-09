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
		this._findElement(); // Set input element

		// Set input value to given initState. If initState not given, input value will be equal "value" attribute in HTML
		if (initState !== undefined){ this._setElemValue(initState); }

		// Set saved value if saving is true
		if (stateSaving){
			// Set input value to saved
			this._setElemValue(sessionStorage[this.id] !== undefined ? this._getFormattedSessionStorage() : this._getElemValue());
		}
		// Set local state parameters
		this.#localState = this.#prevLocalState = this._getElemValue(); // Set userInput value

		// Update input (by event or setting "state" parameter)
		this.setInputState = (state) => {

			// Set previous input state
			this.#prevLocalState = this.#localState;

			// Update local state parameter
			this.#localState = state;

			// Set input value
			this._setElemValue(this.#localState);

			// Save the value to 'sessionStorage'
			if ( stateSaving ) this._setSessionStorage(this.#localState);

			// Run the callback function if given
			callback && callback(this.#localState, this);
		}
		// Event listener
		this._eventListener();

		// Run the callback function if any
		callback && callback(this.state, this);
	}
	// Set input element value
	_setElemValue(value){
		this.element.value = value;
	}
	// Get input element value
	_getElemValue(){
		return this.element.value;
	}
	// Get processed sessionStorage variable
	_getFormattedSessionStorage(){
		return sessionStorage[this.id];
	}
	// Save value to sessionStorage
	_setSessionStorage(value){
		sessionStorage[this.id] = this.#localState;
	}
	// Find input element in the DOM
	_findElement(){
		this.element = document.getElementById(this.id);
	}
	// Event listener setup
	_eventListener(){
		this.element.addEventListener(this.eventName, ()=>{ this.setInputState(this._getElemValue()) });
	}
}

export class NumberInput extends TextInput {
	_setElemValue(value){
		this.element.value = +value;
	}
	_getElemValue(){
		return +this.element.value;
	}
}

export class CheckboxInput extends TextInput {
	_setElemValue(state){
		this.element.checked = state == true;
	}
	_getElemValue(){
		return this.element.checked;
	}
	_getFormattedSessionStorage(){
		return sessionStorage[this.id] == 'true';
	}
}

export class RadioInput extends TextInput {
	_setElemValue(state){
		this.element.querySelector(`input[value="${state}"]`).checked = true;
	}
	_getElemValue(){
		return this.element.querySelector(`input:checked`).value;
	}
}

export class  ManualInput extends TextInput {
	_eventListener(){ }
	_findElement(){ 
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
	#wasChanged = false;
	constructor ({id, stateSaving, initState, negativeMassCheckboxParams, onChange, onInput, onUpdate}){
		super({id: id, stateSaving: stateSaving, initState: UtilityMethods.roundTo(UtilityMethods.getRandomArbitrary(0.5, 100), 1), 
			callback: (state, ths)=>{
				// Set label value
				ths.element.querySelector('.title').innerHTML = UtilityMethods.roundTo(state, 4);
			}
		});
		this.onChange = onChange;
		// Negative mass checkbox
		this.negativeMassCheckbox = new CheckboxInput({
			...negativeMassCheckboxParams,
			stateSaving: true,
			callback: (state) => {
				this.state = state ? -Math.abs(this.state) : Math.abs(this.state);
				negativeMassCheckboxParams.callback && negativeMassCheckboxParams.callback();
			}
		});
		this.valueElem = this.element.querySelector('.mass_input'); // Input range element
		// On Input
		this.valueElem.addEventListener('input', (e)=>{
			this.isInput = true;
			this.state = this.#inputValueToAbsolute(this.valueElem.value);
			let menuContainer = document.getElementById('options_menu_container');
			if (!menuContainer.className.includes(" zero_opacity")){
				this.valueElem.closest('.option_item').className += " nozeroopacity";
				menuContainer.className += " zero_opacity";
			}
			this.#wasChanged = true;
		});

		this.valueElem.addEventListener('change', this.#onchanged);
		document.addEventListener('mouseup', this.#onchanged);
		document.addEventListener('touchend', this.#onchanged);
		
		// On Update
		document.addEventListener('inputsUpdate', () => {
			if (!this.isInput){
				this.valueElem.value = this.#absoluteValueToInput(this.state);
			}
		})
	}
	#inputValueToAbsolute(inputValue){
		return (Math.pow(Math.pow(inputValue, 2) / 2 * ( (innerWidth + innerHeight) / 2 / camera.animZoom ), 2)) * (this.negativeMassCheckbox.state ? -1 : 1)
	}
	#absoluteValueToInput(absValue){
		return Math.pow(scene.getRadiusFromMass(absValue) * camera.animZoom * 2 / ((innerHeight + innerWidth) / 2), 1/2)
	}

	// On Change
	#onchanged = () => {
		if (!this.#wasChanged) return;
		this.isInput = false;
		let menuContainer = document.getElementById('options_menu_container');
		menuContainer.className = menuContainer.className.replace(" zero_opacity", "");
		this.valueElem.closest('.option_item').className = this.valueElem.closest('.option_item').className.replace(" nozeroopacity", "");
		this.onChange && this.onChange(); // Callback
		this.#wasChanged = false;
	}
	_findElement(){ 
		this.element = document.getElementById(this.id);
	}
}