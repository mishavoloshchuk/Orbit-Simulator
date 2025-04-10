export default class Recorder {
    frames = [];
    originalArray;
    currentFrame = 0;
    state = 'stopped';
    playbackSpeed = 1;
    
    constructor(scene) {
        this.scene = scene;
    }

    storeFrame() {
        const objArr = scene.makeObjArrCopy();
        objArr.forEach(obj => {
            obj.x = Math.round(obj.x);
            obj.y = Math.round(obj.y);
            obj.m = Math.round(obj.m);
            
            delete obj.vx;
            delete obj.vy;
            delete obj.r;
            delete obj.trace;
            delete obj.lock;
            delete obj.parentObj;
        });
        
        this.frames.push(objArr);
    }

    frame() {
        if (this.state === 'recording' && !pauseState) {
            this.storeFrame();
        }

        if (this.state === 'playing') {
            this.playback();
        }
    }

    playback() {
        if (this.currentFrame < this.frames.length) {
            this.playFrame(this.currentFrame);
            
            this.currentFrame += this.playbackSpeed;
        } else {
            this.currentFrame = 0;
        }

        renderer.allowRender();
    }

    record() {
        this.state = 'recording';
    }
    
    play() {
        this.state = 'playing';
        this.originalArray = this.scene.makeObjArrCopy();
    }

    pause() {
        this.state = 'stopped';
    }

    playFrame(frame = this.currentFrame) {
        frame = this.getProperFrameIndex(frame);
        this.scene.objArr = this.frames[frame];

        renderer.allowRender();
    }

    setPlaybackPosition(position) {
        const frame = position * (this.frames.length - 1);
        this.setCurrentFrame(frame);
        return frame;
    }

    setCurrentFrame(frame) {
        this.currentFrame = this.getProperFrameIndex(frame);
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
    }

    getProperFrameIndex(frame) {
        return Math.max(0, Math.min(this.frames.length, Math.floor(frame)));
    }

    cancel() {
        this.state = 'stopped';
        if (this.originalArray) {
            this.scene.objArr = this.originalArray;
        }
        renderer.allowRender();
    }

    reset() {
        this.state = 'stopped';
        this.frames = [];
        renderer.allowRender();
    }
}