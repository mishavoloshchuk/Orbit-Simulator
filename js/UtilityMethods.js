class UtilityMethods {
	// Get random range
	static getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}
	// Digits after point
	static roundTo(number, afterPoint) {
		const digintsCount = Math.pow(10, afterPoint);
		return Math.round((number * digintsCount))/digintsCount;
	}
	//Cмешивение Цветов===================================
	static toHexInt(i){
		return parseInt(i, 16);
	}
	static _mixColors(color1, color2, m1, m2){

		let color = "";
		/*
		 * Сначала считаем среднее по красному цвету - xx---- + yy----
		 * Затем по зеленому --xx-- + --yy--
		 * И по синему ----xx + ----yy
		 */
		for(let i = 0; i < color1.length; i += 2){
		    let partColor = Math.round((this.toHexInt(color1.slice(i, i+2))*m1 + this.toHexInt(color2.slice(i, i+2))*m2)/(m1+m2)).toString(16);

		    color += (partColor.length === 1 ? "0" + partColor : partColor);
		}
		return color;
	}

	static mixColors(color1, color2, m1 = 50, m2 = 50){
		let c1 = color1[0] === "#" ? color1.slice(1) : color1;
		let c2 = color2[0] === "#" ? color2.slice(1) : color2;

		return "#" + this._mixColors(c1, c2, Math.abs(m1), Math.abs(m2));
	}

	static randomColor(avoidColor, minCloseness) {
		const maxClosenes = 420; // Cube diagonal with sides 255
		minCloseness = this.limit(minCloseness, 0, maxClosenes);
		const distanceToGray = UtilityMethods.calculateDistance([127.5, 127.5, 127.5], UtilityMethods.hexToRgb(avoidColor));
		minCloseness = Math.min(maxClosenes/2 + distanceToGray, minCloseness);
		let color = [0, 0, 0];
		const currentDistance = () => UtilityMethods.calculateDistance(color, UtilityMethods.hexToRgb(avoidColor));
		do {
			color = color.map(val => Math.round(UtilityMethods.getRandomArbitrary(0, 255)));
		} while (currentDistance() < minCloseness);
		const hexColor = this.rgbToHex(color)
		return hexColor;
	}

	static hexToRgb(hex) {
		let rgb = parseInt(hex.substring(1), 16);
		const red   = (rgb >> 16) & 0xFF;
		const green = (rgb >> 8) & 0xFF;
		const blue  = rgb & 0xFF;
		return [red, green, blue];
	}

	static rgbToHex(rgb) {
		return "#" + rgb.reduce((hex, col) => hex + col.toString(16).padStart(2, '0'), '');
	}

	static sumArray(arr){
		let sum = 0;
		for (let val of arr){ sum += val }
		return sum;
	}

	// Get exponential value if value bigger than 1
	static expVal(F, round = 1000){
		let val = F > 1 ? Math.pow(F, 8) : F;
		return Math.round(val * round) / round;
	}

	static isArrsEqual(a, b) {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (a.length !== b.length) return false;

		for (let i = a.length; i--;) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}

	static limit(num, min, max){
		if (num >= max) return max;
		else if (num <= min) return min;
		return num;
	}

	/**
	 * Deep object clone
	 * Note
	 * @link https://developer.mozilla.org/en-US/docs/Glossary/Deep_copy
	 * **/
	static deepClone(instance){
		return JSON.parse(JSON.stringify(instance));
	}

	// A distance between two points in n dimentions
	static calculateDistance(point1, point2) {
		if (point1.length !== point2.length) {
			throw new Error('Both points should have the same number of dimensions');
		}

		let sumOfSquares = 0;

		for (let i = 0; i < point1.length; i++) {
			sumOfSquares += Math.pow(point2[i] - point1[i], 2);
		}

		const distance = Math.sqrt(sumOfSquares);
		return distance;
	}
	// Pythagorean theorem
	static gipot(a,b){return Math.sqrt(a*a + b*b) }

	// Get new object id, when objects array changed
	static getIdAfterArrChange = (delArr, objId, defaultValue = null) => {
		return delArr.reduce((newObjId, currId) => { 
			if (objId > currId) return newObjId - 1;
			else if (objId === currId) return defaultValue;
			return newObjId; // If objId less than any of delArr
		 }, objId);
	}

	static getDeviceType = () => {
		const ua = navigator.userAgent;
		if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
			return "tablet";
		} else
		if ( /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua) ) {
		  return "mobile";
		}
		return "desktop";
	}

	// Get elements by class name iterator
	static byClassElementsLoop = function (className, callback){
		let elements = document.getElementsByClassName(className);
		for (let el = elements.length; el--;){
			callback(elements[el]);
		}
	}
}