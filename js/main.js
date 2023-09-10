import './inputInterface.js';
import Scene from './Scene.js';
import Camera from './Camera.js';
import Physics from './Physics.js';
import Renderer from './Renderer.js';
import * as UIConnect from './UIConnect.js';
import './inputInterface.js';
import IndicateFPS from './IndicateFPS.js';
import TrajectoryPreview from './TrajectoryPreview.js';

// Tasks to frame begin
self.frameTasks = new Array(); // Functions array
self.addFrameBeginTask = function (func, ...args){
	frameTasks.push({func: func, args: args});
}

// Fix GPU in Chrome
self.GPUJS = typeof GPU === 'function' ? GPU : GPU.GPU;

self.gpuComputeAvailable = [GPUJS.isGPUSupported, GPUJS.isSinglePrecisionSupported, GPUJS.isWebGLSupported].every(exp => exp);

self.anyTextInputHasFocus = false;

// === ...
self.mov_obj = null; // Moving object id
self.minMouseMove = UtilityMethods.getDeviceType() == 'desktop' ? 5 : 10; // Minimal mouse move to show new object trajectory preview in pixels
self.isMinMouseMove = false; // If mouse moved minMouseMove pix from last mouse down
let renderStopLatency; // Frames to render after render disabled

// Parameters of new object that will be created, if user will want to create an object
self.newObjParams = {
	screenX: 0, // Position X
	screenY: 0, // Position Y
	vx: 0, // Velocity X equals vx if given and svx if not
	vy: 0, // Velocity Y equals vy if given and svy if not
	mass: null, // Object mass via given radius || Radius
	color: null,
	objLck: null,
	main_obj: null		
}

//Debug
self.maxFPS = false;
self.nextFrame = false;

// FPS indicator init
self.fpsIndicator = new IndicateFPS();

// Scene init
self.scene = new Scene();
scene.frame = frame;

// Init camera
self.camera = new Camera();

// Physics init
self.physics = new Physics(scene);

// Init render
self.renderer = new Renderer({camera: camera, scene: scene});

// Init trajectory preview
self.trajectoryPreview = new TrajectoryPreview({scene: scene, renderer: renderer, physics: physics, camera: camera});

self.simulationsPerFrame = 1; // Physics simulations per one frame

// UI Initialization
ui.init();

// After new object created function
let newObjectCreatedCallback = function() {
	scene.show_obj_count();
	renderer.allowFrameRender = true;
	if (ui.newObjRandColor.state) ui.newObjColor.state = UtilityMethods.randomColor(ui.backgroundColor.state, 220);
}

document.getElementById('background_color_select').addEventListener('change', newObjectCreatedCallback);

const switcher = {device: 'desktop',
	visT: false}; // Collisions: repulsion merge none

self.swch = {
	s_track: true,
	s_edit: true,
	editObjId: null,
	s_mainObj: false,
	allowObjCreating: navMenu.menuSelected === 'create',
	tapCamMove: false
};

scene.addNewObject({x: 0, y: 0, vx: 0, vy: 0, mass: 1000, color: '#ffff00', objLck: false, callback: newObjectCreatedCallback}); // First object init

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
					svx = ((mouse.leftDownX-mcx)/30) * UtilityMethods.expVal(ui.launchForce.state);
					svy = ((mouse.leftDownY-mcy)/30) * UtilityMethods.expVal(ui.launchForce.state);	
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

window.onresize = function(){
	renderer.resolutionX = window.innerWidth;
	renderer.resolutionY = window.innerHeight;
	renderer.allowFrameRender = true;
	camera.centerX = innerWidth / 2;
	camera.centerY = innerHeight / 2;
	setFullScreenIcon(); // Check full screen mode and set the button icon
	UIConnect.MassInput.update();
	scene.resetPrevScreenPositions(); // Reset objects prev screen positions 'cause they're not relevant
}
//===================================================================================

// Frame control
let frameInterval;
self.allowCompute = false;
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
	if (mouse.middleDown || navMenu.menuSelected == 'move' || (mouse.leftDown && swch.tapCamMove)){renderer.layersDiv.style.cursor = "move";}else{renderer.layersDiv.style.cursor = "default";};

	swch.tapCamMove = navMenu.menuSelected !== 'create' && !renderer.canv1.visualSelect;

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
		UIConnect.MassInput.update();
		renderStopLatency = 125; // Count of frames to render after render is disabled
	} else {
		// If traces mode is 1 render ${renderStopLatency} frames after render disabled
		if (renderStopLatency && ui.tracesMode.state == 1 && !pauseState){
			renderStopLatency --;
			UIConnect.MassInput.update();
			renderer.renderObjects();
		}
	}

	// Show distance
	if (navMenu.menuSelected == 'create' && !mouse.leftDown && ui.showDistanceFromCursorToMainObj.state && !renderer.canv1.visualSelect){
		renderer.clearLayer1();
		renderer.visDistance([mouse.x, mouse.y], '#888888');
	}
	// Hide launch power label
	if (!swch.allowObjCreating || renderer.canv1.visualSelect){
		launchPowerLabel.style.display = 'none';
	}

	if (renderer.canv1.visualSelect){
		renderer.clearLayer1();
		delete renderer.canv1.visualSelect;
	}
	const nearObjId = scene.objectSelect('nearest');
	if (navMenu.menuSelected == 'delete'){
		renderer.visualObjectSelect(scene.objectSelect(ui.deletingMode.state), '#ff0000');
	} else
	if (navMenu.menuSelected == 'camera' && swch.s_track){
		renderer.visualObjectSelect(scene.objectSelect('nearest', camera.Target),'#0af');
	} else
	if (navMenu.menuSelected == 'move'){
		renderer.visualObjectSelect(nearObjId,'#bbb');
	} else
	if (navMenu.menuSelected == 'edit' && swch.s_edit){
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
			navMenu.menuVisibility(false);
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

background_image.onerror = function(){
	this.src = 'background/background.jpg';
	let err_mess_el = document.getElementById('url_err_message');
	err_mess_el.style.opacity = '1';
	err_mess_el.style.maxHeight = '2em';
	setTimeout(function(){ err_mess_el.style.opacity = '0'; err_mess_el.style.maxHeight = '0';}, 2000);
}

// If texinput "input" event
UtilityMethods.byClassElementsLoop('input_text', (inp) => {
	inp.addEventListener('focus', (event) => {
		anyTextInputHasFocus = true;
	});
	inp.addEventListener('blur', (event) => {
		anyTextInputHasFocus = false;
	});
});

// Show or hide menu
UtilityMethods.byClassElementsLoop('checkbox_title_option', (element) => {
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
