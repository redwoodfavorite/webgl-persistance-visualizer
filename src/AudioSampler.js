function AudioSampler() {
	this.ctx = new AudioContext();
	this.analyser = this.ctx.createAnalyser();

	this.data = new Uint8Array(this.analyser.frequencyBinCount);
}

AudioSampler.prototype = {
	sampleFrom: function sampleFrom(input) {
		this.audioElement = input;
		this.audioSrc = this.ctx.createMediaElementSource(input);
		this.audioSrc.connect(this.analyser);
	},

	sample: function sample() {
		this.analyser.getByteFrequencyData(this.data);

		return this.data;
	}
};

module.exports = AudioSampler;