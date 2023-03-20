// Physics calculations
function calculate({ 
	objectsArray, 
	object1Id, 
	interactMode, 
	gravitMode, 
	g, 
	timeSpeed
}){
	const obj1 = objectsArray[object1Id];
	if (interactMode === 0){
		for (let object2Id = object1Id; object2Id--;){
			const obj2 = objectsArray[object2Id];

			if (obj2.lock === true && obj1.lock === true) continue;

			let D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
			let sin = (obj2.y - obj1.y)/D; // Sin
			let cos = (obj2.x - obj1.x)/D; // Cos

			if (ui.collisionMode.state === "2"){
				const radiusSum = obj1.r + obj2.r;
				if (D - radiusSum <= 0){
					gravitMode = 4;
				}
			}

			let vector = gravity_func(sin, cos, D, gravitMode, obj2.m, obj1.m, timeSpeed, g);
			// Add calculated vectors to object 1
			if (!obj1.lock){
				obj1.vx += vector[0];
				obj1.vy += vector[1];
			}
			// Add calculated vectors to object 2
			if (!obj2.lock){
				obj2.vx -= vector[2];
				obj2.vy -= vector[3];
			}
		}
	} else
	if (interactMode === 1 && obj1.main_obj !== undefined ){
		const object2Id = obj1.main_obj;
		const obj2 = objectsArray[object2Id];

		const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
		const sin = (obj2.y - obj1.y)/D; // Sin
		const cos = (obj2.x - obj1.x)/D; // Cos

		// Physics vector calculation
		let vector = gravity_func(sin, cos, D, gravitMode, obj2.m, obj1.m, timeSpeed, g);

		if (vector !== undefined){
			// Add calculated vectors to object 1
			if (!obj1.lock){
				obj1.vx += vector[0];
				obj1.vy += vector[1];
			}
			// Add calculated vectors to object 2
			if (!obj2.lock){
				obj2.vx -= vector[2];
				obj2.vy -= vector[3];
			}
		}
	}
};

//Функции притяжения
function gravity_func(sin, cos, D, gravitMode, mass1, mass2, timeSpeed, g){
	let kff = 0.0, vx = 0.0, vy = 0.0;
	//Обратно-пропорционально квадрату расстояния
	if (gravitMode === 1){  // The gravitMode variable must be a number
		kff = g * timeSpeed * 0.5;
		vx = kff*(cos/(D*D));
		vy = kff*(sin/(D*D));
	} else
	//Обранто-пропорционально кубу расстояния
	if (gravitMode === 0){
		kff = g * timeSpeed * 50;
		vx = kff*(cos/(D*D*D));
		vy = kff*(sin/(D*D*D));
	} else
	//Обранто-пропорционально расстоянию
	if (gravitMode === 2){
		kff = g * timeSpeed * 0.005;
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