// 8-bit style sound effects using Web Audio API

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export const playJumpSound = () => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(150, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
};

export const playCrashSound = () => {
  const ctx = getAudioContext();
  
  // Noise burst
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  // Add low frequency thump
  const oscillator = ctx.createOscillator();
  const oscGain = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(100, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
  oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  noise.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.connect(oscGain);
  oscGain.connect(ctx.destination);
  
  noise.start(ctx.currentTime);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
};

export const playMilestoneSound = () => {
  const ctx = getAudioContext();
  
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
  
  notes.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    
    const startTime = ctx.currentTime + i * 0.08;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.15);
  });
};

export const playSpeedUpSound = () => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(200, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.25);
};

export const playPowerUpSound = () => {
  const ctx = getAudioContext();
  
  // Magical ascending chime
  const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
  
  notes.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    
    const startTime = ctx.currentTime + i * 0.05;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.2);
  });
};
