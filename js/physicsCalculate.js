import CollisionMode from "./Enums/CollisionMode.js";
import InteractionMode from "./Enums/InteractionMode.js";

// Physics calculations
export function calculate({ 
	objectsArray, 
	object1Id, 
	interactMode, 
	gravitMode, 
	g, 
	timeSpeed,
	collisionType
}){
	const obj1 = objectsArray[object1Id];
	if (interactMode === InteractionMode.All){
		for (let object2Id = object1Id; object2Id--;){
			const obj2 = objectsArray[object2Id];

			interact(obj1, obj2);
		}
	} else
	if (interactMode === InteractionMode.Parent){
		const obj2 = objectsArray[obj1.parentObj];

		if (obj2 !== undefined) {
			interact(obj1, obj2);
		}
	}

	function interact(obj1, obj2) {
		if (obj2.lock === true && obj1.lock === true) return;
	
		const D = obj1.distance(obj2);
		const sin = (obj2.y - obj1.y)/D;
		const cos = (obj2.x - obj1.x)/D;
	
		if (collisionType === CollisionMode.None){
			const radiusSum = obj1.r + obj2.r;
			if (D <= radiusSum) gravitMode = 4;
		}
		const vector = gravity_func(sin, cos, D, gravitMode, obj2.m, obj1.m, timeSpeed, g);
		
		// Add calculated vectors to object 1
		obj1.vx += vector[0];
		obj1.vy += vector[1];
		
		// Add calculated vectors to object 2
		obj2.vx -= vector[2];
		obj2.vy -= vector[3];
	}
}

//Функции притяжения
export function gravity_func(sin, cos, D, gravitMode, mass1, mass2, timeSpeed, g){
	let vx = 0.0, vy = 0.0;
	//Обратно-пропорционально квадрату расстояния
	if (gravitMode === 1){  // The gravitMode variable must be a number
		const kff = g * timeSpeed * 5;
		const pow2Distance = D*D;
		vx = kff*(cos/pow2Distance);
		vy = kff*(sin/pow2Distance);
	} else
	//Обранто-пропорционально кубу расстояния
	if (gravitMode === 0){
		const kff = g * timeSpeed * 500;
		const pow3Distance = D*D*D;
		vx = kff*(cos/pow3Distance);
		vy = kff*(sin/pow3Distance);
	} else
	//Обранто-пропорционально расстоянию
	if (gravitMode === 2){
		const kff = g * timeSpeed * 0.05;
		vx = kff*(cos/D);
		vy = kff*(sin/D);
	} else
	//Постоянное притяжение
	if (gravitMode === 3){
		const kff = g * timeSpeed * 0.00005;
		vx = kff*(cos);
		vy = kff*(sin);
	} else
	//Пропорционально расстоянию
	if (gravitMode === 4){
		const kff = g * timeSpeed * 0.0000005;
		vx = kff*(cos*D);
		vy = kff*(sin*D);
	}

	return [vx*mass1, vy*mass1, vx*mass2, vy*mass2];
}