// Physics calculations
function calculate({ 
	objectsArray, 
	object1Id, 
	interactMode, 
	gravitMode, 
	g, 
	timeSpeed,
	collisionType
}){
	const obj1 = objectsArray[object1Id];
	if (interactMode === 0){
		for (let object2Id = object1Id; object2Id--;){
			const obj2 = objectsArray[object2Id];

			if (obj2.lock === true && obj1.lock === true) continue;
			const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
			const sin = (obj2.y - obj1.y)/D; // Sin
			const cos = (obj2.x - obj1.x)/D; // Cos

			if (collisionType === 2){
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
	} else
	if (interactMode === 1 && obj1.main_obj !== undefined ){
		const object2Id = obj1.main_obj;
		const obj2 = objectsArray[object2Id];

		if (obj2 !== undefined) {
			const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
			const sin = (obj2.y - obj1.y)/D; // Sin
			const cos = (obj2.x - obj1.x)/D; // Cos

			// Physics vector calculation
			let vector = gravity_func(sin, cos, D, gravitMode, obj2.m, obj1.m, timeSpeed, g);

			if (vector !== undefined){
				// Add calculated vectors to object 1
				obj1.vx += vector[0];
				obj1.vy += vector[1];

				// Add calculated vectors to object 2
				obj2.vx -= vector[2];
				obj2.vy -= vector[3];
			}
		}
	}
	// Reset speed if object locked
	if (obj1.lock) {
		obj1.vx = obj1.vy = 0;
	}
}

//Функции притяжения
function gravity_func(sin, cos, D, gravitMode, mass1, mass2, timeSpeed, g){
	let kff = 0.0, vx = 0.0, vy = 0.0;
	//Обратно-пропорционально квадрату расстояния
	if (gravitMode === 1){  // The gravitMode variable must be a number
		kff = g * timeSpeed * 5;
		const pow2Distance = D*D;
		vx = kff*(cos/pow2Distance);
		vy = kff*(sin/pow2Distance);
	} else
	//Обранто-пропорционально кубу расстояния
	if (gravitMode === 0){
		kff = g * timeSpeed * 500;
		const pow3Distance = D*D*D;
		vx = kff*(cos/pow3Distance);
		vy = kff*(sin/pow3Distance);
	} else
	//Обранто-пропорционально расстоянию
	if (gravitMode === 2){
		kff = g * timeSpeed * 0.05;
		vx = kff*(cos/D);
		vy = kff*(sin/D);
	} else
	//Постоянное притяжение
	if (gravitMode === 3){
		kff = g * timeSpeed * 0.00005;
		vx = kff*(cos);
		vy = kff*(sin);
	} else
	//Пропорционально расстоянию
	if (gravitMode === 4){
		kff = g * timeSpeed * 0.0000005;
		vx = kff*(cos*D);
		vy = kff*(sin*D);
	}
	//Отправить вектор
	return [vx*mass1, vy*mass1, vx*mass2, vy*mass2];
}

function dist(x1, y1, x2, y2) { 
	return Math.sqrt((x1 - x2)*(x1 - x2) + (y1 - y2)*(y1 - y2));
}