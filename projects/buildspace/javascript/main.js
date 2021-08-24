var anim = {dblsctt: false, weOffer: false};
document.onscroll = (e) => {
	var elem = document.querySelector('.aboutNow');
	var posY = (getCoords(elem).bottom+getCoords(elem).top)/2;
	if (window.pageYOffset+window.innerHeight >= posY && window.pageYOffset <= posY && !anim.dblsctt){
		anim.dblsctt = true;
	}
	elem = document.querySelector('.serviceItem');
	posY = (getCoords(elem).bottom+getCoords(elem).top)/2;
	if (window.pageYOffset+window.innerHeight >= posY && window.pageYOffset <= posY && !anim.weOffer){
		anim.weOffer = true;
	}

}

function getCoords(elem) {
	let box = elem.getBoundingClientRect();
	return {
		top: box.top + pageYOffset,
		left: box.left + pageXOffset,
		bottom: box.bottom + pageYOffset,
	};
}
frame()
function frame(){
	window.requestAnimationFrame(frame);
	if (anim.dblsctt){
		document.querySelector('.dblLeftBox').style['animation-name'] = 'mainTSlide';
		let ourAchieves = document.querySelector('.ourAchieves');
		document.querySelector('.backGradient').style['animation-name'] = 'mainTSlide';
		ourAchieves.childNodes[1].style.animationName = 'mainTSlide';
		ourAchieves.childNodes[3].style.animationName = 'mainTSlide';
		ourAchieves.childNodes[5].style.animationName = 'mainTSlide';
	}
	if (anim.weOffer){
		let elems = document.querySelector('.services').childNodes;
		for (let i in elems){
			if (elems[i].className == 'serviceItem'){
				elems[i].style.animationName = 'mainTSlide';
			}
		}
		
	}
	if (window.pageYOffset >= 100){
		document.querySelector('.toUp').style.display = 'initial';
		setTimeout(()=>{document.querySelector('.toUp').style.opacity = '0.8';}, 150);
	} else {
		document.querySelector('.toUp').style.opacity = '0';
		setTimeout(()=>{document.querySelector('.toUp').style.display = 'none';}, 150);
	}
}