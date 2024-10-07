const PI_2 = UtilityMethods.roundTo(Math.PI * 2, 5);

export default class Painter {
	static #tctx;
	static drawOn(tctx) {
		this.#tctx = tctx;
		tctx.beginPath();
		return this;
	}

	static circle(x, y, radius) {
		const c = this.#tctx;
		c.beginPath();

		c.arc(x, y, radius, 0, PI_2);

		return this;
	}

	static line(...args) {
		const c = this.#tctx;

		const modificator = typeof args[args.length - 1] === "function" 
			? args.pop()
			: (x, y) => [x, y];

		const points = args;
		c.moveTo(...modificator(points[0][0], points[0][1])); // Start
		for (let i = 1; i < points.length; i++) {
			const point = points[i];
			c.lineTo(...modificator(point[0], point[1]));
		}

		return this;
	}

	static rect(posX, posY, width, height) {
		const c = this.#tctx;
		c.rect(posX, posY, width, height);

		return this;
	}

	static fill(color = undefined, options = {}) {
		const c = this.#tctx;
		c.save();

		color && (c.fillStyle = color);
		Object.assign(c, options);

		c.fill();
		c.restore();
	}

	static stroke(color = undefined, lineWidth = undefined, options = {}) {
		const c = this.#tctx;
		c.save();

		color && (c.strokeStyle = color);
		lineWidth && (c.lineWidth = lineWidth);
		Object.assign(c, options);

		c.stroke();
		c.restore();
	}

	static drawCross(x, y, width = 1, size = 5, color = '#ff0000'){
		const c = this.#tctx;
		c.strokeStyle = ui.backgroundColor.state;
		for (let i = 0; i < 2; i++){
			Painter.drawOn(c)
			.line([x - size, y - size], [x + size, y + size])
			.line([x + size, y - size], [x - size, y + size])
			.stroke(undefined, width, {lineCap: 'round'});
			c.strokeStyle = color;
		}
	}

	static drawMinusSign(x, y, radius, color, options = {}) {
		const c = this.#tctx;
		c.strokeStyle = color;
		c.lineWidth = radius / 5;
		Object.assign(c, options);
		Painter.drawOn(c);
		Painter.circle(x, y, radius).stroke();

		Painter.line([x - (radius * 0.66), y], [x + (radius * 0.66), y]).stroke();
	}
}