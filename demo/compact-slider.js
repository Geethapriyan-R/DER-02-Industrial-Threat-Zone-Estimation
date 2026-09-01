/**
 * CompactSlider UI Component Suite
 * Inspired by buh/CompactSlider (SwiftUI)
 * Implements Prominent Linear Sliders, Polar Wheel/Compass Scrubbers, 
 * Fine-tune Steppers, and Dynamic Monospace Value Displays.
 */

(function(root) {

class CompactLinearSlider {
    constructor(options) {
        this.containerId = options.containerId;
        this.label = options.label || "Value";
        this.icon = options.icon || "";
        this.min = options.min !== undefined ? options.min : 0;
        this.max = options.max !== undefined ? options.max : 100;
        this.step = options.step || 1;
        this.value = options.value !== undefined ? options.value : this.min;
        this.unit = options.unit || "";
        this.variant = options.variant || "primary"; // 'danger', 'warning', 'info', 'purple', 'emerald', 'cyan'
        this.formatFn = options.formatFn || ((v) => v.toLocaleString());
        this.onChange = options.onChange || (() => {});
        this.showStepper = options.showStepper !== false;
        this.scale = options.scale || "linear"; // 'linear' or 'log'
        
        this.isDragging = false;
        this.init();
    }

    init() {
        this.container = typeof this.containerId === 'string' 
            ? document.getElementById(this.containerId) 
            : this.containerId;
            
        if (!this.container) {
            console.error(`CompactSlider container #${this.containerId} not found.`);
            return;
        }

        this.render();
        this.bindEvents();
        this.updateVisuals(false);
    }

    render() {
        this.container.classList.add("compact-slider-wrapper", `variant-${this.variant}`);
        this.container.innerHTML = `
            <div class="compact-slider-card">
                <div class="compact-slider-header">
                    <div class="compact-slider-title">
                        ${this.icon ? `<span class="compact-slider-icon">${this.icon}</span>` : ''}
                        <span class="compact-slider-label">${this.label}</span>
                    </div>
                    <div class="compact-slider-readout">
                        <span class="compact-slider-value" id="${this.containerId}-val">${this.formatFn(this.value)}</span>
                        ${this.unit ? `<span class="compact-slider-unit">${this.unit}</span>` : ''}
                    </div>
                </div>
                
                <div class="compact-slider-body">
                    ${this.showStepper ? `
                        <button type="button" class="compact-stepper-btn btn-minus" title="Decrease value" aria-label="Decrease">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    ` : ''}
                    
                    <div class="compact-track-container" tabindex="0" role="slider" aria-valuemin="${this.min}" aria-valuemax="${this.max}" aria-valuenow="${this.value}">
                        <div class="compact-track-bg"></div>
                        <div class="compact-track-fill"></div>
                        <div class="compact-track-ticks"></div>
                        <div class="compact-handle">
                            <div class="compact-handle-grip"></div>
                        </div>
                    </div>
                    
                    ${this.showStepper ? `
                        <button type="button" class="compact-stepper-btn btn-plus" title="Increase value" aria-label="Increase">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        this.trackContainer = this.container.querySelector(".compact-track-container");
        this.trackFill = this.container.querySelector(".compact-track-fill");
        this.handle = this.container.querySelector(".compact-handle");
        this.valueDisplay = this.container.querySelector(".compact-slider-value");
        this.minusBtn = this.container.querySelector(".btn-minus");
        this.plusBtn = this.container.querySelector(".btn-plus");
        this.card = this.container.querySelector(".compact-slider-card");
    }

    getPercentage() {
        if (this.scale === "log") {
            const minLog = Math.log(Math.max(1, this.min));
            const maxLog = Math.log(this.max);
            const valLog = Math.log(Math.max(1, this.value));
            return Math.max(0, Math.min(1, (valLog - minLog) / (maxLog - minLog)));
        }
        return Math.max(0, Math.min(1, (this.value - this.min) / (this.max - this.min)));
    }

    valueFromPercentage(pct) {
        pct = Math.max(0, Math.min(1, pct));
        let rawVal;
        if (this.scale === "log") {
            const minLog = Math.log(Math.max(1, this.min));
            const maxLog = Math.log(this.max);
            rawVal = Math.exp(minLog + pct * (maxLog - minLog));
        } else {
            rawVal = this.min + pct * (this.max - this.min);
        }
        
        // Round to nearest step
        if (this.step < 1) {
            const precision = Math.round(-Math.log10(this.step));
            const stepped = Math.round(rawVal / this.step) * this.step;
            return Number(stepped.toFixed(precision));
        } else {
            const stepped = Math.round(rawVal / this.step) * this.step;
            return Math.max(this.min, Math.min(this.max, stepped));
        }
    }

    updateVisuals(triggerCallback = true) {
        const pct = this.getPercentage();
        const pct100 = (pct * 100).toFixed(2) + "%";
        
        this.trackFill.style.width = pct100;
        this.handle.style.left = pct100;
        this.valueDisplay.textContent = this.formatFn(this.value);
        this.trackContainer.setAttribute("aria-valuenow", this.value);

        if (triggerCallback && this.onChange) {
            this.onChange(this.value);
        }
    }

    setValue(newVal, triggerCallback = true) {
        newVal = Math.max(this.min, Math.min(this.max, newVal));
        if (this.step < 1) {
            const precision = Math.round(-Math.log10(this.step));
            newVal = Number(newVal.toFixed(precision));
        } else {
            newVal = Math.round(newVal / this.step) * this.step;
        }
        this.value = newVal;
        this.updateVisuals(triggerCallback);
    }

    bindEvents() {
        const onPointerMove = (e) => {
            if (!this.isDragging) return;
            const rect = this.trackContainer.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const pct = (clientX - rect.left) / rect.width;
            const newVal = this.valueFromPercentage(pct);
            if (newVal !== this.value) {
                this.value = newVal;
                this.updateVisuals(true);
            }
        };

        const onPointerUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.card.classList.remove("is-active-dragging");
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", onPointerUp);
                window.removeEventListener("pointercancel", onPointerUp);
            }
        };

        this.trackContainer.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.card.classList.add("is-active-dragging");
            
            const rect = this.trackContainer.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            this.value = this.valueFromPercentage(pct);
            this.updateVisuals(true);
            
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            window.addEventListener("pointercancel", onPointerUp);
        });

        // Mouse Wheel Scrubbing
        this.trackContainer.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1 : -1;
            this.setValue(this.value + delta * this.step, true);
        }, { passive: false });

        // Stepper Buttons
        if (this.minusBtn) {
            this.minusBtn.addEventListener("click", () => {
                this.setValue(this.value - this.step, true);
            });
        }
        if (this.plusBtn) {
            this.plusBtn.addEventListener("click", () => {
                this.setValue(this.value + this.step, true);
            });
        }

        // Keyboard Support
        this.trackContainer.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                this.setValue(this.value - this.step, true);
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                this.setValue(this.value + this.step, true);
            } else if (e.key === "Home") {
                e.preventDefault();
                this.setValue(this.min, true);
            } else if (e.key === "End") {
                e.preventDefault();
                this.setValue(this.max, true);
            }
        });
    }
}


/**
 * CompactPolarCompassSlider
 * Inspired by CompactSlider polar / wheel angle controls
 */
class CompactPolarCompassSlider {
    constructor(options) {
        this.containerId = options.containerId;
        this.label = options.label || "Wind Direction";
        this.value = options.value !== undefined ? options.value : 0; // 0 to 360 deg
        this.onChange = options.onChange || (() => {});
        this.isDragging = false;
        
        this.init();
    }

    init() {
        this.container = typeof this.containerId === 'string' 
            ? document.getElementById(this.containerId) 
            : this.containerId;
            
        if (!this.container) {
            console.error(`CompactPolarCompassSlider container #${this.containerId} not found.`);
            return;
        }

        this.render();
        this.bindEvents();
        this.updateVisuals(false);
    }

    render() {
        this.container.classList.add("compact-polar-wrapper");
        this.container.innerHTML = `
            <div class="compact-polar-card">
                <div class="compact-polar-header">
                    <div class="compact-polar-title">
                        <span class="compact-polar-icon">🧭</span>
                        <span class="compact-polar-label">${this.label}</span>
                    </div>
                    <div class="compact-polar-readout">
                        <span class="compact-polar-deg" id="${this.containerId}-deg">0°</span>
                        <span class="compact-polar-cardinal" id="${this.containerId}-cardinal">N</span>
                    </div>
                </div>

                <div class="compact-dial-interactive-zone">
                    <div class="compact-compass-dial" tabindex="0" role="slider" aria-label="Wind Direction Compass">
                        <div class="compass-outer-ring">
                            <div class="compass-ticks-svg">
                                ${this.generateDialTicks()}
                            </div>
                            <div class="compass-cardinal-label n">N</div>
                            <div class="compass-cardinal-label e">E</div>
                            <div class="compass-cardinal-label s">S</div>
                            <div class="compass-cardinal-label w">W</div>
                        </div>
                        <div class="compass-needle-layer">
                            <div class="compass-needle-arrow"></div>
                            <div class="compass-needle-tail"></div>
                            <div class="compass-center-cap"></div>
                        </div>
                    </div>
                </div>

                <div class="compact-cardinal-chips">
                    <button type="button" class="cardinal-chip" data-deg="0">N</button>
                    <button type="button" class="cardinal-chip" data-deg="45">NE</button>
                    <button type="button" class="cardinal-chip" data-deg="90">E</button>
                    <button type="button" class="cardinal-chip" data-deg="135">SE</button>
                    <button type="button" class="cardinal-chip" data-deg="180">S</button>
                    <button type="button" class="cardinal-chip" data-deg="225">SW</button>
                    <button type="button" class="cardinal-chip" data-deg="270">W</button>
                    <button type="button" class="cardinal-chip" data-deg="315">NW</button>
                </div>
            </div>
        `;

        this.dial = this.container.querySelector(".compact-compass-dial");
        this.needle = this.container.querySelector(".compass-needle-layer");
        this.degDisplay = this.container.querySelector(".compact-polar-deg");
        this.cardinalDisplay = this.container.querySelector(".compact-polar-cardinal");
        this.card = this.container.querySelector(".compact-polar-card");
        this.cardinalChips = this.container.querySelectorAll(".cardinal-chip");
    }

    generateDialTicks() {
        let svg = `<svg viewBox="0 0 100 100" class="compass-svg">`;
        for (let deg = 0; deg < 360; deg += 15) {
            const isMajor = deg % 45 === 0;
            const isMedium = deg % 30 === 0;
            const len = isMajor ? 8 : (isMedium ? 5 : 3);
            const stroke = isMajor ? '#00f0ff' : (isMedium ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)');
            const strokeW = isMajor ? 1.8 : 1.0;
            const rad = (deg * Math.PI) / 180;
            const x1 = 50 + 44 * Math.sin(rad);
            const y1 = 50 - 44 * Math.cos(rad);
            const x2 = 50 + (44 - len) * Math.sin(rad);
            const y2 = 50 - (44 - len) * Math.cos(rad);
            svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${strokeW}"/>`;
        }
        svg += `</svg>`;
        return svg;
    }

    getCardinalName(deg) {
        const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        const normalized = ((deg % 360) + 360) % 360;
        const idx = Math.round(normalized / (360.0 / dirs.length)) % dirs.length;
        return dirs[idx];
    }

    updateVisuals(triggerCallback = true) {
        const normalized = Math.round(((this.value % 360) + 360) % 360);
        this.needle.style.transform = `rotate(${normalized}deg)`;
        this.degDisplay.textContent = `${normalized}°`;
        const cardinal = this.getCardinalName(normalized);
        this.cardinalDisplay.textContent = cardinal;

        // Highlight active cardinal chip if matched
        this.cardinalChips.forEach(chip => {
            const chipDeg = parseInt(chip.getAttribute("data-deg"), 10);
            if (Math.abs(chipDeg - normalized) <= 10 || (chipDeg === 0 && normalized >= 350)) {
                chip.classList.add("active");
            } else {
                chip.classList.remove("active");
            }
        });

        if (triggerCallback && this.onChange) {
            this.onChange(normalized);
        }
    }

    setAngleFromEvent(e) {
        const rect = this.dial.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        
        let rad = Math.atan2(dx, -dy);
        let deg = (rad * 180) / Math.PI;
        if (deg < 0) deg += 360;
        
        this.value = Math.round(deg);
        this.updateVisuals(true);
    }

    setValue(deg, triggerCallback = true) {
        this.value = Math.round(((deg % 360) + 360) % 360);
        this.updateVisuals(triggerCallback);
    }

    bindEvents() {
        const onPointerMove = (e) => {
            if (!this.isDragging) return;
            this.setAngleFromEvent(e);
        };

        const onPointerUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.card.classList.remove("is-active-dragging");
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", onPointerUp);
                window.removeEventListener("pointercancel", onPointerUp);
            }
        };

        this.dial.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.card.classList.add("is-active-dragging");
            this.setAngleFromEvent(e);
            
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            window.addEventListener("pointercancel", onPointerUp);
        });

        // Quick cardinal chips click
        this.cardinalChips.forEach(chip => {
            chip.addEventListener("click", () => {
                const targetDeg = parseInt(chip.getAttribute("data-deg"), 10);
                this.setValue(targetDeg, true);
            });
        });

        // Wheel rotation
        this.dial.addEventListener("wheel", (e) => {
            e.preventDefault();
            const step = e.shiftKey ? 15 : 5;
            const delta = e.deltaY < 0 ? step : -step;
            this.setValue(this.value + delta, true);
        }, { passive: false });

        // Keyboard navigation
        this.dial.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                this.setValue(this.value - 5, true);
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                this.setValue(this.value + 5, true);
            }
        });
    }
}

// Expose globally
root.CompactLinearSlider = CompactLinearSlider;
root.CompactPolarCompassSlider = CompactPolarCompassSlider;

})(typeof window !== 'undefined' ? window : this);
