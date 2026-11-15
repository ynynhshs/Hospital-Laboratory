(function () {
    'use strict';

    const toggle = document.getElementById('soundToggle');
    if (!toggle) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext;

    function playSound() {
        if (!toggle.checked || !AudioContext) return;

        try {
            audioContext = audioContext || new AudioContext();

            if (audioContext.state === 'suspended') {
                audioContext.resume().catch((error) => {
                    console.error('Unable to resume interaction audio:', error);
                });
            }

            const oscillator = audioContext.createOscillator();
            const volume = audioContext.createGain();
            const now = audioContext.currentTime;

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, now);
            oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.07);
            volume.gain.setValueAtTime(0.0001, now);
            volume.gain.exponentialRampToValueAtTime(0.025, now + 0.012);
            volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

            oscillator.connect(volume);
            volume.connect(audioContext.destination);
            oscillator.start(now);
            oscillator.stop(now + 0.12);
        } catch (error) {
            console.error('Unable to play interaction audio:', error);
        }
    }

    if (!AudioContext) {
        toggle.disabled = true;
        toggle.parentElement.title = 'Interaction sounds are not supported in this browser.';
        return;
    }

    document.addEventListener('click', playSound, true);
})();
