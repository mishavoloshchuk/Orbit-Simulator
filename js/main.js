import Scene from './Scene.js';
import Camera from './Camera.js';
import Physics from './Physics.js';
import Renderer from './Renderer.js';
import UserInput from './UserInput.js';
import IndicateFPS from './IndicateFPS.js';
import TrajectoryPreview from './TrajectoryPreview.js';

self.ui = new Object();

window.onload = function(){
	//Mouse
	this.mouse = {
		x: window.innerWidth/1.5,
		y: window.innerHeight/2,
		leftDown: false,
		leftDownX: window.innerWidth/2,
		leftDownY: window.innerHeight/2,
		leftUpX: window.innerWidth/1.4,
		leftUpY: window.innerHeight/2,
		ctrlModificatorMouseX: null,
		ctrlModificatorMouseY: null,
		rightDown: false,
		middleDown: false,
		move: false,

		ctrlModificatedMousePosition: function (modificator = 10) {
			let mx, my;
			if (this.ctrlModificatorMouseY !== null && this.ctrlModificatorMouseY !== null){
				mx = this.ctrlModificatorMouseX - (this.ctrlModificatorMouseX - this.x) / modificator;
				my = this.ctrlModificatorMouseY - (this.ctrlModificatorMouseY - this.y) / modificator;		
			} else {
				mx = this.x;
				my = this.y;
			}
			return [mx, my];
		},
		ctrlTriggerModificator: function (){
			this.ctrlModificatorMouseX = this.x;
			this.ctrlModificatorMouseY = this.y;
		},
		ctrlUntriggerModificator: function (){
			this.ctrlModificatorMouseX = this.ctrlModificatorMouseY = null;
		}
	}

	// Touch
	let allowClick = true; // If touches > 1 cancel the click event. If true - allow click

	// Tasks to frame begin
	this.frameTasks = new Array(); // Functions array
	function addFrameBeginTask(func, ...args){
		frameTasks.push({func: func, args: args});
	}

	this.getDeviceType = () => {
		const ua = navigator.userAgent;
		if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
			return "tablet";
		} else
		if ( /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua) ) {
		  return "mobile";
		}
		return "desktop";
	};

	// Get new object id, when objects array changed
	this.getIdAfterArrChange = (delArr, objId, defaultValue = null) => {
		return delArr.reduce((newObjId, currId) => { 
			if (objId > currId) return newObjId - 1;
			else if (objId === currId) return defaultValue;
			return newObjId; // If objId less than any of delArr
		 }, objId);
	}

	// Fix GPU in Chrome
	this.GPUJS = typeof GPU === 'function' ? GPU : GPU.GPU;

	this.gpuComputeAvailable = [GPUJS.isGPUSupported, GPUJS.isSinglePrecisionSupported, GPUJS.isWebGLSupported].every(exp => exp);

	let mbut = 'create';
	let menu_state = true; // Menu state (Opened/Closed)
	if (sessionStorage['mbut'] && sessionStorage['menu_state']){
		mbut = sessionStorage['mbut'];
		menu_state = sessionStorage['menu_state'] == 'true';
	}
	setMenuStateIcon(mbut);
	//Buttons
	let cbut = '';
	let chck = '';
	let pfb = mbut;

	let anyTextInputHasFocus = false;

	// === ...
	this.mov_obj = null; // Moving object id
	this.movingObjectPosition = []; // Moving object position and velocity
	this.minMouseMove = getDeviceType() == 'desktop' ? 5 : 10; // Minimal mouse move to show new object trajectory preview in pixels
	this.isMinMouseMove = false; // If mouse moved minMouseMove pix from last mouse down
	let renderStopLatency; // Frames to render after render disabled
	// Parameters of new object that will be created, if user will want to create an object
	this.newObjParams = {
		screenX: 0, // Position X
		screenY: 0, // Position Y
		vx: 0, // Velocity X equals vx if given and svx if not
		vy: 0, // Velocity Y equals vy if given and svy if not
		mass: null, // Object mass via given radius || Radius
		color: null,
		objLck: null,
		main_obj: null		
	}

	// Camera touch control
	let prev_cam_x = 0;
	let prev_cam_y = 0;
	let zm_prev = 1;
	let zm_cff = null;

	//Debug
	this.maxFPS = false;
	this.nextFrame = false;

	// FPS indicator init
	this.fpsIndicator = new IndicateFPS();

	// Scene init
	this.scene = new Scene();
	scene.frame = frame;

	// Init camera
	this.camera = new Camera();

	// Physics init
	this.physics = new Physics(scene);

	// Init render
	this.renderer = new Renderer({camera: camera, scene: scene});

	// Init trajectory preview
	this.trajectoryPreview = new TrajectoryPreview({scene: scene, renderer: renderer, physics: physics, camera: camera});

	this.pauseState = false; // Global pause state
	this.simulationsPerFrame = 1; // Physics simulations per one frame

	// After new object created function
	let newObjectCreatedCallback = function() {
		scene.show_obj_count();
		renderer.allowFrameRender = true;
		if (ui.newObjRandColor.state) ui.newObjColor.state = scene.randomColor();
	}

	const switcher = {device: 'desktop',
		visT: false}; // Collisions: repulsion merge none

	this.swch = {
		s_track: true,
		s_edit: true,
		editObjId: null,
		s_mainObj: false,
		allowObjCreating: mbut === 'create',
		tapCamMove: false
	};

	const menu_names = {create: 'menu_options', delete: 'del_menu_options', edit: 'edit_menu',
		help: 'help_menu', settings: 'settings_menu', camera: 'camera_menu', trajectory: 'traj_menu',
		world_settings: 'world_settings_menu'}

	function allowRender(){
		renderer.allowFrameRender = true;
	}

	class UserMassInput extends UserInput {
		static update = function (){
			document.dispatchEvent(UserMassInput.inputsUpdate);
		}
		static inputsUpdate = new Event('inputsUpdate');
		wasChanged = false;
		constructor ({id, stateSaving, initState, negativeMassCheckboxParams, onChange, onInput, onUpdate}){
			super({type: 'manualInput', id: id, stateSaving: stateSaving, initState: Math.round(getRandomArbitrary(0.5, 100)*10)/10, 
				callback: (state)=>{
					const ths = document.getElementById(id);
					ths.getElementsByClassName('title')[0].innerHTML = Math.round(state*1000)/1000;
				}
			});
			this.elem = document.getElementById(id); // Option item DOM element
			// Negative mass checkbox
			this.negativeMassCheckbox = new UserInput({
				type: 'checkbox', 
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

	// Init user interface
	ui.init = function (){
		// Create object menu ================================================ 
		this.newObjColor = new UserInput({type: 'color', id: 'newObjeColorSelect', stateSaving: true, initState: scene.randomColor()}); // Menu color select input
		this.newObjRandColor = new UserInput({type: 'checkbox', id: 'randColorCheck', stateSaving: true, initState: true}); // Menu new object random color input
		this.newObjMass = new UserMassInput({id: 'create_mass', stateSaving: true, initState: Math.round(getRandomArbitrary(0.5, 100)*10)/10, negativeMassCheckboxParams: {id: "new_obj_negative_mass"}, callback: (state)=>{
			document.getElementById('newObjMassSpan').innerHTML = Math.round(state*1000)/1000;
		}}); // Menu new object's mass input
		this.newObjLock = new UserInput({type: 'checkbox', id: 'objLckCeck', initState: false}); // Menu lock created object input
		//
		this.launchForce = new UserInput({type: 'range', id: 'launch_power', stateSaving: true, callback: (val)=>{lnch_pwr_span.innerHTML = expVal(val); mouse.move = true;}, eventName: 'input'}); // Menu launch power value input
		this.pauseWhenCreatingObject = new UserInput({type: 'checkbox', id: 'new_obj_pause', stateSaving: true, initState: true, callback: (val, elem)=>{elem.prevPauseState = false}}); // Menu pause when user add object input
		this.movementCompencation = new UserInput({type: 'checkbox', id: 'movement_compencation_checkbox', stateSaving: true, initState: true});
		this.creationRelativeTo = new UserInput({type: 'radio', id: 'creation_relative_to', stateSaving: true}); // Creation relative mode
		this.newObjCircularOrbit = new UserInput({type: 'checkbox', id: 'circleOrbitCheck', stateSaving: true, initState: true, callback: (val) => {
			// Set reverse orbit checkbox disabled state
			const reverseOrbitCheckbox = document.getElementById('objReverseCheck');
			if (val){
				reverseOrbitCheckbox.removeAttribute('disabled');
			} else {
				reverseOrbitCheckbox.setAttribute('disabled', '');
			}
		}}); // Menu circle orbit on click input
		this.newObjCreateReverseOrbit = new UserInput({type: 'checkbox', id: 'objReverseCheck', stateSaving: true, initState: false}); // Menu reverse ordit direction input
		this.showDistanceFromCursorToMainObj = new UserInput({type: 'checkbox', id: 'vis_distance_check', stateSaving: true, callback: ()=>{ launchPowerLabel.style.display = 'none'; renderer.clearLayer2(); }}); // Menu visual distance
		//
		this.showNewObjTrajectory = new UserInput({type: 'checkbox', id: 'traj_prev_check', stateSaving: true, initState: true}); // Enable trajectory calculation before create object
		this.newObjTrajLength = new UserInput({type: 'range', id: 'traj_calc_samples', stateSaving: true}); // Trajectory calutulation length input
		this.newObjTrajAccuracity = new UserInput({type: 'range', id: 'traj_calc_accuracity', stateSaving: true }); // Trajectory accuracity input

		// Delete object menu =================================================
		this.deletingMode = new UserInput({type: 'radio', id: 'dellMethodRadio'}); // Deleting method

		// Edit object menu ===================================================
		this.editMass = new UserMassInput({id: 'mass_edit', stateSaving: false, initState: 1000, callback: (state) => {
				document.getElementById('editObjMassSpan').innerHTML = Math.round(state*1000)/1000;
			},
			negativeMassCheckboxParams: {
				id: 'edit_obj_negative_mass',
				stateSaving: false,
				callback: (state) => {
					if (this.editMass){
						this.editMass.state = state ? -Math.abs(this.editMass.state) : Math.abs(this.editMass.state);
						allowRender();
						addFrameBeginTask(()=>{
							if (scene.objArr[swch.editObjId]) scene.objArr[swch.editObjId].m = this.editMass.state;
						});
					}
				}
			},
			onChange: ()=>{
				addFrameBeginTask(() => {
					if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].m = ui.editMass.state; allowRender();}
				});
			}
		});
		this.editColor = new UserInput({type: 'color', id: 'col_edit', eventName: 'input', callback: (state) => addFrameBeginTask(() => {
			if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].color = state; allowRender();}
		}), });
		this.editLock = new UserInput({type: 'checkbox', id: 'lck_edit_chbox', callback: (state) => addFrameBeginTask(() => {
			if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].lock = state; allowRender();}
		}), });
		// Trace settings =====================================================
		this.tracesMode = new UserInput({type: 'radio', id: 'traj_radio_buttons', stateSaving: true, initState: 1, callback: (val, elem) => {
			for (let element of traj_menu.getElementsByClassName('additionalOption')){
				// Show additional options by radio value
				if ( element.id.includes(val.toString()) && !element.hasAttribute('disabled')) { 
					element.style.display = 'inline';
				} else {
					element.style.display = 'none';
					}
			}
			if (elem.prevState != val){ // If state changed
				addFrameBeginTask(()=>{
					renderer.clearLayer1();
					renderer.clearLayer3();
					allowRender();
				}); // Clear render layers
			}

		} });
		// Mode 1
		this.traceMode1Length = new UserInput({type: 'range', id: 'trace1Lnth', stateSaving: true, eventName: 'input', callback: (val, ths) => {ths.value = Math.pow(1 - val, 2)} });
		this.traceMode1Opacity = new UserInput({type: 'range', id: 'trace_opacity', stateSaving: true, eventName: 'input', callback: (val)=>{renderer.canv3.style.opacity = val; allowRender();} });
		this.traceMode1Blur = new UserInput({type: 'range', id: 'trace_blur', stateSaving: true, eventName: 'input', callback: (val)=>{renderer.canv3.style.filter = `blur(${val*val}px)`; allowRender();} });
		// Mode 2
		this.traceMode2Particles = new UserInput({type: 'checkbox', id: 'trc2PrtclsChck', stateSaving: true, initState: true, callback: allowRender});
		this.traceMode2Trembling = new UserInput({type: 'checkbox', id: 'trc2TrembChck', stateSaving: true, initState: true, callback: allowRender});
		this.traceMode2Length = new UserInput({type: 'range', id: 'trace2Lnth', stateSaving: true, eventName: 'input', callback: allowRender});
		// Mode 3 
		this.traceMode3Width = new UserInput({type: 'range', id: 'trace3WdInp', stateSaving: true, eventName: 'input', callback: allowRender});
		this.traceMode3Quality = new UserInput({type: 'range', id: 'trace3Qu', stateSaving: true, eventName: 'input', callback: allowRender});
		this.traceMode3Length = new UserInput({type: 'range', id: 'trace3Lnth', stateSaving: true, eventName: 'input', callback: allowRender});

		// Camera menu ========================================================
		this.zoomToScreenCenter = new UserInput({type: 'checkbox', id: 'chck_zoomToScreenCenter', stateSaving: true, initState: false}); // Zoom to cursor as default. If enabled zoom, zooming to screen center

		// Physics menu =======================
		this.gravitationMode = new UserInput({type: 'radio', id: 'gravit_mode_radio_buttons', stateSaving: true}); // Select gravitation mode (radio)
		this.g = new UserInput({type: 'range', id: 'g_value', eventName: 'input', callback: (val, ths)=>{g_value_title.innerHTML = ths.value = expVal(val)}, initState: 1}); // Set gravitation (G) value
		this.interactMode = new UserInput({type: 'radio', id: 'interact_radio_buttons', stateSaving: true}); // Select interactions mode
		this.collisionMode = new UserInput({type: 'radio', id: 'collision_radio_buttons', stateSaving: true}); // Select collision mode

		// Settings menu ======================================================
		// Select background image
		this.backgroundImageURL = new UserInput({type: 'text', id: 'img_url_inp', stateSaving: true, callback: (value)=>{
			value = value == '' ? 'background/background.jpg' : value;
			document.getElementById('background_image').setAttribute('src', value);
		}, });
		// Set background darkness
		this.backgroundDarkness = new UserInput({type: 'range', id: 'bg_darkness', stateSaving: true, eventName: 'input', callback: (state, elem)=>{
			background_image.style.opacity = state;
		}, });
		this.backgroundFollowsMouse = new UserInput({type: 'checkbox', id: 'mouse_move_bg', stateSaving: true, initState: true}), // If true, background follows the cursor
			// Show FPS
		this.showFPS = new UserInput({type: 'checkbox', id: 'check_fps_swch', stateSaving: true, callback: (val)=>{
			if (val){ fpsIndicator.turnOn() }
			else { fpsIndicator.turnOff() }
		}, });
		this.gpuCompute = new UserInput({type: 'checkbox', id: 'gpu_compute', stateSaving: true, initState: true, callback: (val, input)=>{
			if (!gpuComputeAvailable) {
				input.element.parentElement.style.display = 'none'; // Hide multithread option, if gpu not supported
			}
		}});
		this.maxPerformance = new UserInput({type: 'checkbox', id: 'max_performance', stateSaving: true, callback: (state)=>{
			if (state) {
				renderer.ctx3.clearRect(0,0, renderer.resolutionX, renderer.resolutionY);
				renderer.canv3.style.display = background_image.style.display = 'none';
				additionalTrajectoryOptionsExtended1.style.display = 'none';
				renderer.allowFrameRender = true; // Render
				view_settings.className += ' disabled'; // Hide view settings
			} else {
				renderer.ctx1.clearRect(0,0, renderer.resolutionX, renderer.resolutionY);
				renderer.canv3.style.display = background_image.style.display = '';
				additionalTrajectoryOptionsExtended1.style.display = 'initial';
				renderer.allowFrameRender = true; // Render
				view_settings.className = view_settings.className.replace('disabled', ''); // Hide view settings
			}
			this.tracesMode.state = this.tracesMode.state; // Refresh trace mode menu
		}});

		this.timeSpeed = new UserInput({type: 'manualInput', initState: 1, callback: (val, inpVar)=>{
			document.querySelector('.time_speed h2').innerHTML = 'T - X' + (val * simulationsPerFrame);
			let changedVal = val / inpVar.prevState;
			inpVar.changed = inpVar.changed !== undefined ? inpVar.changed * changedVal : changedVal;
			addFrameBeginTask(()=>{ // Frame begin taks
				// Change time speed correction
				if (this.timeSpeed.changed !== undefined){
					for (let object of scene.objArr){
						object.x += (object.vx * this.timeSpeed.state - object.vx * (this.timeSpeed.state / this.timeSpeed.changed))/2;
						object.y += (object.vy * this.timeSpeed.state - object.vy * (this.timeSpeed.state / this.timeSpeed.changed))/2;
					}
					delete this.timeSpeed.changed;
				}
			});
			
		}, eventName: 'input'}); // Time speed control
	}
	ui.init();

	ui.maxPerformance.element.addEventListener('change', (e)=>{
		// In Chrome-based browsers the fastest traces mode is 1
		const isChromium = navigator.userAgent.match(/Chrome\/\d+/) !== null;
		if (e.target.checked) ui.tracesMode.state = isChromium ? 1 : 0; // Set fastest traces mode
	});

	scene.addNewObject({x: 0, y: 0, vx: 0, vy: 0, mass: 1000, color: '#ffff00', objLck: false, callback: newObjectCreatedCallback}); // First object init

	function menu_open_restore(){
		if (menu_state){
			document.querySelector('#'+(menu_names[mbut] ?menu_names [mbut] : 'create')).style.display = 'inline-block';
		}
	}
	menu_open_restore();

	//Mouse and touches
	let multiTouch = 0;
	let avTouchPoint = {x: null, y: null, xd: null, yd: null};
	let mscam = true;

	window.onresize = function(){
		renderer.resolutionX = window.innerWidth;
		renderer.resolutionY = window.innerHeight;
		renderer.allowFrameRender = true;
		camera.centerX = innerWidth / 2;
		camera.centerY = innerHeight / 2;
		setFullScreenIcon(); // Check full screen mode and set the button icon
		UserMassInput.update();
		scene.resetPrevScreenPositions(); // Reset objects prev screen positions 'cause they're not relevant
	}
	// Touch events ======================================
	// Touch START
	let touchStartEvent = false;
	document.getElementById('renderLayers').addEventListener('touchstart', function(event){
		event.preventDefault();
		prev_cam_x = camera.x;
		prev_cam_y = camera.y;
		mouseDownHandler(event);
	});
	// Touch END
	document.getElementById('renderLayers').addEventListener('touchend', function(event){
		mouseUpHandler(event);
		zm_prev = camera.animZoom;
	});
	// Touch MOVE
	document.getElementById('renderLayers').addEventListener('touchmove', function(event){
		event.preventDefault();
		mouse.move = true;
		// Touch point
		event.clientX = event.targetTouches[0].clientX;// Touch X
		event.clientY = event.targetTouches[0].clientY;// Touch Y
		if (swch.tapCamMove && mouse.leftDown && !camera.hasTarget()){
			camera.x += (mouse.x - event.clientX)/camera.animZoom;
			camera.y += (mouse.y - event.clientY)/camera.animZoom;
			let mstate = menu_state;
			close_all_menus(); 
			menu_state = mstate;
			camera.setTarget();
		}
		[mouse.x, mouse.y] = [event.clientX, event.clientY]; // Set cursor position
		isMinMouseMove = isMinMouseMove ? true : dist(mouse.x, mouse.y, mouse.leftDownX, mouse.leftDownY) >= minMouseMove;
		// Averrage point of touchs
		let av_touch_x = [];
		let av_touch_y = [];
		// Object move start/end
		if (mbut == 'move'){
			if (multiTouch == 1 && allowClick) {
				movingObjectBegin(); // Object move start
			} else {
				// Object move end
				if (scene.objArr[mov_obj]){
					scene.objArr[mov_obj].vx = movingObjectPosition[2];
					scene.objArr[mov_obj].vy = movingObjectPosition[3];
					mov_obj = null;
				}
			}
		}
		movingObject(); // Moving object if mouse down && mbut == "move"
		if (event.changedTouches.length == 2){ // If multitouch
			//All touch points array
			for (let i = 0; i < event.changedTouches.length; i++){
				av_touch_x.push(event.changedTouches[i].clientX);
				av_touch_y.push(event.changedTouches[i].clientY);
			} 
			// Averrage point of touchs
			avTouchPoint.x = sumArray(av_touch_x)/av_touch_x.length;
			avTouchPoint.y = sumArray(av_touch_y)/av_touch_x.length;
			 // Distance between touchs
			let touchZoom = dist(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.changedTouches[1].clientX, event.changedTouches[1].clientY);
			 // Clear launch power label display
			launchPowerLabel.style.display = 'none';

			if (swch.allowObjCreating && mouse.leftDown){
				if (ui.pauseWhenCreatingObject.state){
					pauseState = ui.pauseWhenCreatingObject.prevPauseState;
				}
				renderer.clearLayer2();
			}

			mouse.leftDown = false;
			mscam = false;
			// Mouse down
			if (!avTouchPoint.xd){
				avTouchPoint.xd = avTouchPoint.x;
				avTouchPoint.yd = avTouchPoint.y;
				zm_cff = touchZoom;
			}
			// Cancel camera target if touch camera move
			if (dist(avTouchPoint.xd, avTouchPoint.yd, avTouchPoint.x, avTouchPoint.y) > Math.min(innerWidth, innerHeight)/6){
				if (camera.Target !== undefined){
					avTouchPoint.xd = avTouchPoint.x;
					avTouchPoint.yd = avTouchPoint.y;
					prev_cam_x = camera.x;
					prev_cam_y = camera.y;
					camera.setTarget();
				}
			}
			// Limit zoom
			let newZoom = zm_prev / Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2); // Zoom
			if (newZoom < 10000 && newZoom > 1.0e-12){
				camera.zoom = camera.animZoom = newZoom;
			}
			if (!ui.zoomToScreenCenter.state && camera.Target === undefined){ // If zoom to screen center
				camera.ax = camera.x = prev_cam_x - (avTouchPoint.x - avTouchPoint.xd)/camera.animZoom + (((window.innerWidth/2 - avTouchPoint.xd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerWidth/2 - avTouchPoint.xd)/zm_prev));
				camera.ay = camera.y = prev_cam_y - (avTouchPoint.y - avTouchPoint.yd)/camera.animZoom + (((window.innerHeight/2 - avTouchPoint.yd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerHeight/2 - avTouchPoint.yd)/zm_prev));
			}
		}
	})
	// Mouse events =========================================================
	// Mouse DOWN
	document.getElementById('renderLayers').addEventListener('mousedown', mouseDownHandler);
	function mouseDownHandler(event){
		// Touch
		if (event.type === 'touchstart'){
			multiTouch ++;
			event.clientX = event.targetTouches[0].clientX;
			event.clientY = event.targetTouches[0].clientY;
			allowClick = multiTouch == 1; // If touches > 1 cancel click event (mouse up event)
			// console.log('touchstart');
		}
		// Set cursor position
		[mouse.leftDownX, mouse.leftDownY] = [event.clientX, event.clientY];
		[mouse.x, mouse.y] = [event.clientX, event.clientY];
		isMinMouseMove = false;

		// Left mouse down
		if (event.which == 1 || event.type === 'touchstart'){
			mouse.leftDown = true;

			if (swch.allowObjCreating){
				try {
					clearTimeout(mort);
				} catch(err) {  }
				// If pause when creating object enabled
				if (event.type === 'touchstart'){
					if (ui.pauseWhenCreatingObject.state && multiTouch == 1){
						ui.pauseWhenCreatingObject.prevPauseState = pauseState;
						pauseState = true;
					}
				} else {
					if (ui.pauseWhenCreatingObject.state){
						ui.pauseWhenCreatingObject.prevPauseState = pauseState;
						pauseState = true;
					}
				}
				if (event.ctrlKey){ // If Ctrl pressed
					mouse.ctrlTriggerModificator();
				}
			}
		}
		// Middle mouse down
		if (event.which == 2){
			mouse.middleDown = true;
		}
		// Right mouse down
		if (event.which == 3){
			mouse.rightDown = true;
			if (swch.allowObjCreating && mouse.leftDown){
				launchPowerLabel.style.display = 'none';
				renderer.clearLayer2();		
			}
		}
	}
	// Mouse UP
	document.getElementById('renderLayers').addEventListener('mouseup', mouseUpHandler);
	function mouseUpHandler(event){
		if (event.type === 'touchend'){
			// console.log('touchend');
			event.clientX = mouse.x;
			event.clientY = mouse.y;
		}
		// Set cursor position
		[mouse.x, mouse.y] = [event.clientX, event.clientY];
		avTouchPoint.xd = avTouchPoint.yd = null;
		// Left mouse up
		if (event.which == 1 || (event.type === 'touchend' && allowClick)){
			mouse.leftDown = false;
			[mouse.leftUpX, mouse.leftUpY] = [event.clientX, event.clientY] // Set cursor mouseUp position
			launchPowerLabel.style.display = 'none';
			// Object delete
			if (mbut == 'delete' && scene.objArr.length){
				addFrameBeginTask( () => scene.deleteObject(scene.objectSelect(ui.deletingMode.state)) );
			}
			// Object edit select
			if (mbut == 'edit' && swch.s_edit){
				swch.editObjId = scene.objectSelect();
				swch.s_edit = false;
				syncEditObjUi();
			}
			// // Object move end
			if (mbut == 'move' && scene.objArr[mov_obj] && mov_obj !== null){
				scene.objArr[mov_obj].vx = movingObjectPosition[2];
				scene.objArr[mov_obj].vy = movingObjectPosition[3];
				mov_obj = null;
			}

			// Create object
			if (swch.allowObjCreating){
				if (mscam && !mouse.rightDown){
					addFrameBeginTask(()=>{
						scene.addNewObject(newObjParams);
					});
				}
				let mort = setTimeout(menu_open_restore, 200);
				if (ui.pauseWhenCreatingObject.state){
					pauseState = ui.pauseWhenCreatingObject.prevPauseState;
				}
				renderer.clearLayer2();
			}
			if (mbut == 'camera' && swch.s_track){
				camera.setTarget(scene.objectSelect('nearest', camera.Target));
			}
			if (swch.s_mainObj){
				if (allowClick){
					swch.allowObjCreating = true;
					swch.s_mainObj = false;
					scene.objIdToOrbit = scene.objectSelect();
				}
			}
			if (swch.tapCamMove){
				menu_open_restore();
			}
		}
		// Middle mouse up
		if (event.which == 2 || !mscam){
			mouse.middleDown = false;
			menu_open_restore();
		}
		// Right mouse up
		if (event.which == 3){
			mouse.rightDown = false;
			if (mouse.leftDown){
				launchPowerLabel.style.display = 'block';
				launchPowerLabel.innerHTML = '0';
			}
		}
		// Touch up
		if (event.type === 'touchend'){
			multiTouch --;
			mscam = multiTouch != 0 ? false : true;
		}
	}
	// Mouse MOVE
	document.onmousemove = function(event){
		mouse.move = true;
		if (mouse.leftDown) {
			movingObjectBegin();
			isMinMouseMove = isMinMouseMove ? true : dist(mouse.x, mouse.y, mouse.leftDownX, mouse.leftDownY) >= minMouseMove;
		}
		movingObject(); // Moving object if mouse down && mbut == "move"
		if (
			mouse.middleDown 
			|| (swch.tapCamMove && mouse.leftDown)
		){
			camera.x += (mouse.x - event.clientX)/camera.animZoom;
			camera.y += (mouse.y - event.clientY)/camera.animZoom;
			let mstate = menu_state;
			close_all_menus(); 
			menu_state = mstate;
			camera.setTarget();
		}

		// Set cursor position
		[mouse.x, mouse.y] = [event.clientX, event.clientY];
		if (event.ctrlKey){
			if (mouse.ctrlModificatorMouseX === null){
				mouse.ctrlTriggerModificator();
			}
		} else {
			mouse.ctrlUntriggerModificator();
		}
		bgMoving();
	};

	function syncEditObjUi(){
		const eObj = scene.objArr[swch.editObjId];
		if (eObj){
			const changed = !arraysEqual([eObj.color, eObj.m, eObj.lock], [ui.editColor.state, ui.editMass.state, ui.editLock.state]);
			if (changed && !ui.editMass.isInput){
				setEditUiState({color: eObj.color, m: eObj.m, lock: eObj.lock});
			}
		} else {
			swch.editObjId = null;
			const changed = !arraysEqual(["#FFFFFF", 0, false], [ui.editColor.state, ui.editMass.state, ui.editLock.state]);
			if (changed){
				setEditUiState({color: "#FFFFFF", m: 0, lock: false});
			}
		}
		function setEditUiState({color, m, lock}){
			ui.editColor.state = color;
			ui.editMass.state = m;
			ui.editMass.negativeMassCheckbox.state = m < 0;
			ui.editLock.state = lock;
		}
	}
	// Background movement
	function bgMoving(){
		if (ui.backgroundFollowsMouse.state && ui.backgroundDarkness.state && !ui.maxPerformance.state){
			Object.assign(document.getElementById('background_image').style, {top: (-mouse.y/25)+'px', left: (-mouse.x/25)+'px'});	
		}
	}

	// Set params to the new object
	function setParameterToNewObject(){
		if (swch.allowObjCreating){
			if (mouse.leftDown){
				let circularOrbit = false;
				let [svx, svy] = [0, 0];
				if ( !isMinMouseMove && ui.newObjCircularOrbit.state) {
					circularOrbit = true;
				} else {
					const [mcx, mcy] = mouse.ctrlModificatedMousePosition();
					if (!ui.newObjLock.state){
						svx = ((mouse.leftDownX-mcx)/30) * expVal(ui.launchForce.state);
						svy = ((mouse.leftDownY-mcy)/30) * expVal(ui.launchForce.state);	
					}
				}
				newObjParams = {
					screenX: mouse.leftDownX, // Position X
					screenY: mouse.leftDownY, // Position Y
					vx: svx, // Velocity X equals vx if given and svx if not
					vy: svy, // Velocity Y equals vy if given and svy if not	
					circularOrbit: circularOrbit,
					callback: newObjectCreatedCallback
				};
			} else {
				newObjParams = {
					screenX: mouse.x, // Position X
					screenY: mouse.y, // Position Y
					vx: 0, // Velocity X equals vx if given and svx if not
					vy: 0, // Velocity Y equals vy if given and svy if not	
					circularOrbit: ui.newObjCircularOrbit.state, // Circular orbit
					callback: newObjectCreatedCallback
				};
			}
		}
	}
	//===================================================================================

	// Frame control
	let frameInterval;
	this.allowCompute = false;
	frameControl();
	function frameControl(){
		if (maxFPS !== false){
			if (!frameInterval) frameInterval = setInterval(()=>{frame(); frameControl();}, 1000/maxFPS);
		} else {
			clearInterval(frameInterval);
			frame();
			window.requestAnimationFrame(frameControl);
		}
	}
	function frame(){
		// Measure FPS
		fpsIndicator.measure();
		// Run all functions from frameTasks array
		frameTasks.forEach((task)=>{
			task.func(...task.args);
		});
		frameTasks = []; // Clear frameTasks array

		// Select object to orbit
		if (!scene.objArr[scene.objIdToOrbit]){
			scene.objIdToOrbit = scene.objectSelect('biggest');		
		}

		setParameterToNewObject();
		syncEditObjUi(); // Sync edit object ui

		// Set move cursor style
		if (mouse.middleDown || mbut == 'move' || (mouse.leftDown && swch.tapCamMove)){renderer.layersDiv.style.cursor = "move";}else{renderer.layersDiv.style.cursor = "default";};

		swch.tapCamMove = mbut !== 'create' && !renderer.canv2.visualSelect;

		if (scene.objArr.length){
			// Set objects radiuses
			let maxDiameter = 0;
			for (let obj of scene.objArr){
				obj.r = scene.getRadiusFromMass(obj.m);
				maxDiameter = Math.max(maxDiameter, Math.abs(obj.r) * 2);
			}
			// Set collision ceil size
			physics.collisionCeilSize = maxDiameter || innerWidth; // If max radius of the all objects is zero, set collision ceil size to window inner width 

			// Physics calculating...
			if (!pauseState || nextFrame){
				for(let i = simulationsPerFrame; i--;){
					// Enable GPU compute, if GPU available, GPU computing is allowed and scene objects count is bigger than 200
					if ((gpuComputeAvailable && ui.gpuCompute.state && scene.objArr.length > 200)
						&& ui.interactMode.state === '0'){
						physics.gpuComputeVelocities();
					} else {
						physics.physicsCalculate(); // Scene physics calculations (1 step)
					}
				}
			}
		}
		camera.frame(); // Trigger camera frame
		// Frame rendering...
		if (renderer.allowFrameRender){
			renderer.renderObjects();
			UserMassInput.update();
			renderStopLatency = 125; // Count of frames to render after render is disabled
		} else {
			// If traces mode is 1 render ${renderStopLatency} frames after render disabled
			if (renderStopLatency && ui.tracesMode.state == 1 && !pauseState){
				renderStopLatency --;
				UserMassInput.update();
				renderer.renderObjects();
			}
		}

		// Show distance
		if (mbut == 'create' && !mouse.leftDown && ui.showDistanceFromCursorToMainObj.state && !renderer.canv2.visualSelect){
			renderer.clearLayer2();
			vis_distance([mouse.x, mouse.y], '#888888');
		}
		// Hide launch power label
		if (!swch.allowObjCreating || renderer.canv2.visualSelect){
			launchPowerLabel.style.display = 'none';
		}

		if (renderer.canv2.visualSelect){
			renderer.clearLayer2();
			delete renderer.canv2.visualSelect;
		}
		const nearObjId = scene.objectSelect('nearest');
		if (mbut == 'delete'){
			renderer.visualObjectSelect(scene.objectSelect(ui.deletingMode.state), '#ff0000');
		} else
		if (mbut == 'camera' && swch.s_track){
			renderer.visualObjectSelect(scene.objectSelect('nearest', camera.Target),'#0af');
		} else
		if (mbut == 'move'){
			renderer.visualObjectSelect(nearObjId,'#bbb');
		} else
		if (mbut == 'edit' && swch.s_edit){
			renderer.visualObjectSelect(nearObjId, '#f81', 0);
		} else
		if (swch.s_mainObj){
			renderer.visualObjectSelect(nearObjId,'#bf0');
		}
		// New object trajectory
		if (swch.allowObjCreating 
			&& mouse.leftDown 
			&& !mouse.rightDown 
			&& (mouse.move || (!ui.pauseWhenCreatingObject.state && renderer.allowFrameRender)
			)
			){
			if (isMinMouseMove){
				renderer.visualizeLaunchPower();
				if (ui.showNewObjTrajectory.state){
					// Show trajectory preview
					trajectoryPreview.process({
						trajLen: ui.newObjTrajLength.state, 
						accuracity: ui.newObjTrajAccuracity.state
					});
				}
				// Hide menu while creating new object
				let mstate = menu_state;
				close_all_menus();
				menu_state = mstate;
			}
		}

		// Visualize new object mass
		if (ui.newObjMass.isInput){
			renderer.visObjMass(ui.newObjMass.state, ui.newObjColor.state);
		}
		// Visualize edit object mass
		if (ui.editMass.isInput && scene.objArr[swch.editObjId]){
			renderer.visObjMass(ui.editMass.state, ui.editColor.state, ...renderer.crd2(scene.objArr[swch.editObjId].x, scene.objArr[swch.editObjId].y));
		}

		renderer.allowFrameRender = false;
		mouse.move = false;
		nextFrame = false;
		return true;
	}
	//scene.frame();
	this.addObjects = function(count = 100){
		for (let i = 0; i < count; i++){
		  	addFrameBeginTask(()=>{ 
				scene.addNewObject({...newObjParams,
					screenX: Math.random() * innerWidth,
					screenY: Math.random() * innerHeight
				});
			});
		}
	}
	//addObjects(100);

	// Show distance to main object
	function vis_distance(obj_cord, color = '#888888', objId = scene.objIdToOrbit){
		const tObj = scene.objArr[objId];
		if (tObj){
			const radius = dist(obj_cord[0], obj_cord[1], ...renderer.crd2(tObj.x, tObj.y));
			const ctx = renderer.ctx2;
			if (radius > renderer.getScreenRad(tObj.m)){
				ctx.strokeStyle = color;
				ctx.lineWidth = 2;
				// Line
				ctx.beginPath();
				ctx.moveTo(obj_cord[0], obj_cord[1]);
				ctx.lineTo(...renderer.crd2(tObj.x, tObj.y));
				ctx.stroke();
				// Circle
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.arc(...renderer.crd2(tObj.x, tObj.y), radius, 0, 7);
				ctx.stroke();
				// Points
				ctx.beginPath();
				ctx.fillStyle = color;
				ctx.arc(...renderer.crd2(tObj.x, tObj.y), 3, 0, 7);
				ctx.arc(obj_cord[0], obj_cord[1], 3, 0, 7);
				ctx.fill();
				ctx.beginPath();

				Object.assign(launchPowerLabel.style, {left: `calc(${mouse.x}px + 1em)`, top: `calc(${mouse.y}px - 1em)`, display: 'block', color: color});
				launchPowerLabel.innerHTML = Math.round(radius / camera.animZoom*1000)/1000;
			} else {
				if (!mouse.leftDown){
					launchPowerLabel.style.display = 'none';	
				}
			}		
		}
	}
	//Scene scale
	renderer.layersDiv.addEventListener('wheel', function(e){
		if (!e.ctrlKey && !mov_obj && !(mouse.leftDown && swch.allowObjCreating)){
			if (!mouse.middleDown){
				if (e.deltaY > 0){
					// Zoom out
					camera.zoomTo(-1.25);
				} else {
					// Zoom in
					camera.zoomTo(1.25);
				}		
			}
		}
		// Change the launch force when mouse wheel spins
		if (mouse.leftDown && swch.allowObjCreating) {
			const launchForceChangeValue = 0.1;
			if (!mouse.middleDown){
				if (e.deltaY > 0){
					ui.launchForce.state = ui.launchForce.state > 0 ? ui.launchForce.state - launchForceChangeValue : 0;
				} else {
					ui.launchForce.state = ui.launchForce.state < 2 ? ui.launchForce.state + launchForceChangeValue : 2;
				}					
			}
		
		}
	});
	// Start moving object
	function movingObjectBegin(){
		// Перемещение ближайшео объекта
		if (mbut == 'move' && mov_obj === null){
			mov_obj = scene.objectSelect();
			if (scene.objArr[mov_obj]){
				movingObjectPosition[0] = scene.objArr[mov_obj].x; movingObjectPosition[1] = scene.objArr[mov_obj].y; //Координаты перемещяемого объекта
				movingObjectPosition[2] = scene.objArr[mov_obj].vx; movingObjectPosition[3] = scene.objArr[mov_obj].vy;	// Вектор перемещяемого объекта
				scene.objArr[mov_obj].vx = 0; scene.objArr[mov_obj].vy = 0;
			}
		}
	}
	// Moving object function
	function movingObject(){
		if (mouse.leftDown && mbut == 'move' && mov_obj !== null){ // Moving object
			let newX = (mouse.x - mouse.leftDownX)/camera.animZoom + movingObjectPosition[0]; // New object X
			let newY = (mouse.y - mouse.leftDownY)/camera.animZoom + movingObjectPosition[1]; // New object Y
			// Draw trace while user moving object
			if (scene.objArr[mov_obj]){
				if (ui.tracesMode.state == 1){ // If traces mode == 1
					let dCanv = ui.maxPerformance.state ? renderer.ctx1 : renderer.ctx3;
					dCanv.strokeStyle = scene.objArr[mov_obj].color;
					dCanv.fillStyle = scene.objArr[mov_obj].color;	
					dCanv.lineWidth = renderer.getScreenRad(scene.objArr[mov_obj].m)*2;
					// Line
					dCanv.beginPath();
					dCanv.lineCap = 'round';
					dCanv.moveTo(...renderer.crd2(scene.objArr[mov_obj].x, scene.objArr[mov_obj].y));
					// Set position to user's moving objec
					scene.objArr[mov_obj].x = newX; // New position X
					scene.objArr[mov_obj].y = newY; // New position Y

					dCanv.lineTo(...renderer.crd2(scene.objArr[mov_obj].x, scene.objArr[mov_obj].y));
					dCanv.stroke();
					dCanv.lineCap = 'butt';
				} else {
					scene.objArr[mov_obj].x = newX; // New position X
					scene.objArr[mov_obj].y = newY; // New position Y
				}
				renderer.allowFrameRender = true;
			}
		}	
	}
	//События клавиатуры
	document.addEventListener('keydown', function(e){
		// console.log(e.keyCode);
		if (!e.ctrlKey && !anyTextInputHasFocus){
			switch (e.keyCode){
				case 67:  document.querySelector('#create').click(); break; // (C) Create new object menu
				case 68:  document.querySelector('#delete').click(); break; // (D) Delete object menu
				case 69:  document.querySelector('#edit').click(); break; // (E) Edit object menu
				case 84:  document.querySelector('#trajectory').click(); break; // (T) Trajectory menu
				case 188: document.querySelector('#timedown').click(); break; // (<) Time speed down
				case 191: document.querySelector('#play').click(); break; // (/) Play button
				case 190: document.querySelector('#timeup').click(); break; // (>) Time speed up
				case 77:  document.querySelector('#move').click(); break; // (M) Move object
				case 80:  document.querySelector('#pause').click(); break; // (P) Pause button
				case 72:  document.querySelector('#help').click(); break; // (H) Help menu
				case 83:  document.querySelector('#settings').click(); break; // (S) Settings menu
				case 86:  document.querySelector('#camera').click(); break; // (V) Camera menu
				case 70:  document.querySelector('#world_settings').click(); break; // (F) World physics settings
				case 120: ui.showFPS.state = !ui.showFPS.state; break; // (F9) Show FPS
				case 39:  nextFrame = true; break; // Show one frame when paused (Right arrow)
				case 32: // (Space) Create object
					if (swch.allowObjCreating){
						addFrameBeginTask(()=>{ 
							scene.addNewObject(newObjParams);
						});		
					}
					if (mbut == 'delete' && scene.objArr.length){
						let delete_obj = scene.objectSelect(ui.deletingMode.state);
						addFrameBeginTask( () => scene.deleteObject(delete_obj) );
					}
					break;
				case 107:  // (NumPad +) Zoom in
					camera.zoomTo(2);
					break;
				case 109:  // (NumPad -) Zoom out
					camera.zoomTo(-2);
					break;
			}
			// (+) Simulation speed up withoud lost accuracity. Max limit is computer performance
			if (e.keyCode == 187 || e.keyCode == 61){
				simulationsPerFrame *= 2;
				console.log(simulationsPerFrame);
				document.querySelector('.time_speed h2').innerHTML = 'T - X'+ui.timeSpeed.state*simulationsPerFrame;
			} else
			// (-) Simulation speed down withoud lost accuracity. Min value is realtime
			if (e.keyCode == 189 || e.keyCode == 173){
				if (simulationsPerFrame > 1){simulationsPerFrame /= 2;}
				console.log(simulationsPerFrame);
				document.querySelector('.time_speed h2').innerHTML = 'T - X'+ui.timeSpeed.state*simulationsPerFrame;
			}
		}
		//Ctrl keys
		// (Ctrl+Z) Delete last created object
		if (e.keyCode == 90 && e.ctrlKey) addFrameBeginTask( () => scene.deleteObject( scene.objectSelect('last_created') ) );
		
		//Debug
		if (maxFPS !== false){
			// (NumPad 9) Increase max FPS
			if (e.keyCode == 105){ 
				maxFPS++;
				clearInterval(frameInterval);
				frameInterval = setInterval(frame, 1000/maxFPS);
				console.log(maxFPS);
			}
			// (NumPad 7) Decrease max FPS
			if (e.keyCode == 103){
				maxFPS--;
				clearInterval(frameInterval);
				frameInterval = setInterval(frame, 1000/maxFPS);
				console.log(maxFPS);
			}			
		}
	});

	let noMenuBtns = ['timedown', 'play', 'pause', 'timeup'];
	// Menu buttons handler
	document.getElementById("navigation_menu").addEventListener('click', function(e){
		// console.log(e.target.closest('.btn').getAttribute('id'));
		pfb = mbut; // Prev clicked menu button
		let btn_elem = e.target.closest('.btn');
		mbut = btn_elem.getAttribute('id'); // Clicked menu
		let btn_id = mbut;
		// Menu buttons
		if (!noMenuBtns.includes(btn_id)){
			if (menu_state && btn_id == pfb){
				byClassElementsLoop(menu_names[mbut], (el) => { el.style.display = 'none' });
			}else{
				close_all_menus();
				byClassElementsLoop(menu_names[mbut], (el) => { el.style.display = 'inline-block' });
			}
			menu_state = !menu_state;
			setMenuStateIcon(mbut);
		} else { // Time controls
			// Change time speed
			if (mbut == 'timedown' || mbut == 'timeup'){
				ui.timeSpeed.state *= mbut == 'timedown' ? 0.5 : 2;
			} else
			// Pause
			if (mbut == 'pause'){
				let img_name = pauseState ? 'pause' : 'play';
				if (pauseState){
					setMenuStateIcon('play');
					setTimeout(function(){setMenuStateIcon(pfb);}, 500);			
				} else {
					setMenuStateIcon('pause');	
				}
				pauseState = !pauseState;
				btn_elem.querySelector('img').setAttribute('src', 'ico/'+img_name+'.png');
			} else
			// Play
			if (mbut == 'play'){
				if (ui.timeSpeed.state != 1 || pauseState){ // If time speed == 1 or pause == true
					simulationsPerFrame = 1;
					pauseState = false;
					ui.timeSpeed.state = 1;
					document.querySelector('#pause img').setAttribute('src', 'ico/pause.png');
					setMenuStateIcon('restore');
					setTimeout(function(){setMenuStateIcon(pfb);}, 500);
				}
			}		
		}
		if (noMenuBtns.includes(mbut)) mbut = pfb;
		swch.allowObjCreating = mbut === 'create' && !swch.s_mainObj; // Allow object creating if menu is "Creation menu"
		if (ui.showDistanceFromCursorToMainObj.state) renderer.clearLayer2();

		sessionStorage['mbut'] = mbut;
		sessionStorage['menu_state'] = menu_state;
	});

	background_image.onerror = function(){
		this.src = 'background/background.jpg';
		let err_mess_el = document.getElementById('url_err_message');
		err_mess_el.style.opacity = '1';
		err_mess_el.style.maxHeight = '2em';
		setTimeout(function(){ err_mess_el.style.opacity = '0'; err_mess_el.style.maxHeight = '0';}, 2000);
	}

	// Get elements by class name iterator
	function byClassElementsLoop(className, callback){
		let elements = document.getElementsByClassName(className);
		for (let el = elements.length; el--;){
			callback(elements[el]);
		}
	}

	// Buttons events
	document.addEventListener('click', function(e){
		const target = e.target.closest('.menu_button');
		if (!target) return;
		const cbut = target.getAttribute('id');
		// console.log(cbut);
		switch (cbut) { // Pressed button id
			case 'select_track': // Visual select object to select camera target
				swch.s_track = !swch.s_track;
				break;
			case 'clear_camera_settings': // Restore camera defaults
				camera.setTarget(); // Unset camera target
				camera.x = 0; camera.y = 0; // Set default camera position
				camera.zoom = 1; // Set default camera zoom value
				zm_prev = 1;
				break;
			case 'select_edit_obj': // Visual select object to select edit object
				swch.s_edit = !swch.s_edit;			
				break;
			case 'reset_speed_btn': // Edit menu, set object velocity to 0
				if (scene.objArr[swch.editObjId]){
					scene.objArr[swch.editObjId].vx = 0;
					scene.objArr[swch.editObjId].vy = 0;	
				}
				break;
			case 'select_main_obj': // Visual select object to select main object
				swch.allowObjCreating = swch.s_mainObj;
				swch.s_mainObj = !swch.s_mainObj;
				break;
			case 'wrap_time': // Wrap time
				ui.timeSpeed.state = -ui.timeSpeed.state;
				break;
			case 'save_file': // Save button
				pauseState = true;
				setMenuStateIcon('pause');
				const objArrWrite = JSON.parse(JSON.stringify(scene.objArr));
				for(let i in objArrWrite){
					objArrWrite[i].trace = [];
					delete objArrWrite[i].prevScreenX;
					delete objArrWrite[i].prevScreenY;
					delete objArrWrite[i].prevScreenR;
				}
				let my_data = {
					objArr: objArrWrite, 
					timeSpeed: ui.timeSpeed.state, 
					interactMode: ui.interactMode.state, 
					collisionMode: ui.collisionMode.state,
					gravitationMode: ui.gravitationMode.state,
					g: ui.g.state,
				};
				my_data = JSON.stringify(my_data);
				writeFile("Orbit Simulator - "+lanwich.getTranslatedText("my_world")+".json", my_data);
				//saveFile(name, forat, value, event);
				break;
			case 'sel_file_but': // Load button
				document.querySelector('#select_file').click();
				break;
			case 'clear_traces': // Clear traces
				renderer.clearLayer3();			
				for (let i in scene.objArr){
					scene.objArr[i].trace = [];
				}
				break;
		}
	});
	// Close menu button handler
	document.querySelectorAll('.close_button').forEach(function(element){
		element.addEventListener('click', (event) => {
			close_all_menus();
			event.stopPropagation();
			sessionStorage['mbut'] = mbut;
			sessionStorage['menu_state'] = menu_state;
		})
	});

	// If texinput "input" event
	byClassElementsLoop('input_text', (inp) => {
		inp.addEventListener('focus', (event) => {
			anyTextInputHasFocus = true;
		});
		inp.addEventListener('blur', (event) => {
			anyTextInputHasFocus = false;
		});
	});

	// Show or hide menu
	byClassElementsLoop('checkbox_title_option', (element) => {
		element.getElementsByTagName('input')[0].addEventListener('change', (e) => {
			const titleOptionItem = e.target.closest('.checkbox_title_option');
			if (e.target.checked){
				titleOptionItem.removeAttribute('disabled');
			} else {
				titleOptionItem.setAttribute('disabled', '');
			}
		});
		// Load initial state, after page is loaded
		if (!element.getElementsByTagName('input')[0].checked) {
			element.setAttribute('disabled', '');
		}
	});

	let objDeletedMessageTimeout;

	function close_all_menus(e){
		for (let name in menu_names){
			document.querySelector('#'+menu_names[name]).style.display = 'none';
		}
		document.getElementById(pfb).removeAttribute('selected');
		document.getElementById(mbut).setAttribute('selected', '');
		menu_state = false;
	}
	document.getElementById(mbut).setAttribute('selected', '');
	
	function setMenuStateIcon(img, format = "png", path = "ico/"){
		if (img == 'world_settings'){ img = 'functionX'; }
		document.querySelector('.state').innerHTML = '<img src="'+path+img+'.'+format+'" alt="">';
	}

	function getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	function sumArray(arr){
		let sum = 0;
		for (let val of arr){ sum += val }
		return sum;
	}

	function arraysEqual(a, b) {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (a.length !== b.length) return false;

		for (let i = a.length; i--;) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}

	// Get exponential value if value bigger than 1
	function expVal(F, round = 1000){
		let val = F > 1 ? Math.pow(F, 8) : F;
		return Math.round(val * round) / round;
	}

	// Toggle full screen
	document.getElementById('toggle_fullscreen').addEventListener('click', toggleFullScreen);
	function toggleFullScreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	}
	function setFullScreenIcon() {
		let fullScreenBtn = document.getElementById("toggle_fullscreen");
		if (document.fullscreenElement) {
			fullScreenBtn.setAttribute('enabled', 'true');
		} else {
			if (document.exitFullscreen) {
				fullScreenBtn.setAttribute('enabled', 'false');
			}
		}
	}
	document.addEventListener('fullscreenchange', (e) => {
		if (!document.fullscreenElement) {
			e.target.setAttribute('enabled', 'true');
		} else {
			e.target.setAttribute('enabled', 'false');
		}
	});
	// Close\open options tabs handler
	document.querySelectorAll('.title_option_item').forEach((element) => {
		element.addEventListener('click', (e) => {
			let tab = e.target.closest('.title_option_item');
			tab.setAttribute('closed', (tab.getAttribute('closed') == 'true' ? 'false' : 'true'));
		});
	});
	// Language
	lanwich.onLanguageChange = function (language) {
		document.getElementById('language_selector').value = language;
		let loader = document.getElementById('language_loader'); // Loader element
		loader.style.opacity = 0;
		setTimeout( () => loader.style.display = 'none', 200);
	}
	document.getElementById('language_selector').addEventListener('change', function(event){
		let loader = document.getElementById('language_loader'); // Loader element
		loader.style.cssText = 'display: inline-block; opacity: 0;';
		setTimeout(()=> loader.style.opacity = 1, 16);
		lanwich.setLanguage(event.target.value);
	});
	// File select listener
	document.getElementById('select_file').addEventListener('change', function(e){
		let selectedFile = document.querySelector('#select_file').files[0];
		if (selectedFile !== undefined){
			readFile(selectedFile);
			this.value = '';
		}		
	});
	// Write file
	function writeFile(name, data = '') {
		let download = document.createElement("a");
		download.href = 'data:application/txt;charset=utf-8,' + encodeURIComponent(data);
		download.download = name;
		download.style.display = "none";
		download.id = "download";
		document.body.appendChild(download);
		document.getElementById("download").click();
		document.body.removeChild(download);
	}
	// Read file
	function readFile(file) {
		let reader = new FileReader();
		reader.readAsText(file);
		reader.onload = function() {
			try {
			  	let file_data = JSON.parse(reader.result);
			  	scene.objArr = file_data.objArr;
			  	ui.interactMode.state = file_data.interactMode || 0;
			  	ui.gravitationMode.state = file_data.gravitationMode || 1;
			  	ui.g.state = file_data.g || 1;
			  	ui.collisionMode.state = file_data.collisionMode || 0;
			  	ui.timeSpeed.state = file_data.timeSpeed ? file_data.timeSpeed : 1;
			  	scene.show_obj_count();
			  	renderer.allowFrameRender = true;
			  	renderer.clearLayer3();
				console.log('File loaded successfully!');
			} catch(err){
				console.error(err);
				alert('Несовместимый файл!');
			}
		};
		reader.onerror = function(err) {
			console.error(err);
			alert("Ошибка чтения файла!");
		};
	}
};