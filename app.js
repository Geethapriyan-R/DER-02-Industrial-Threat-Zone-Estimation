/**
 * DER-02 Industrial Threat-Zone Estimation (Approach 2 CompactUI)
 * Main Dashboard Controller
 */

(function() {
    const HM = window.HazardModel;
    const CompactLinearSlider = window.CompactLinearSlider;
    const CompactPolarCompassSlider = window.CompactPolarCompassSlider;

    class ThreatZoneApp {
        constructor() {
            this.state = {
                preset: "hpcl",
                lat: HM.PRESETS.hpcl.lat,
                lon: HM.PRESETS.hpcl.lon,
                fuelMassKg: HM.PRESETS.hpcl.fuelMassKg,
                heatOfCombustion: HM.PRESETS.hpcl.heatOfCombustion,
                burnDuration: HM.PRESETS.hpcl.burnDuration,
                transmissivity: HM.PRESETS.hpcl.transmissivity,
                tntYieldFactor: HM.PRESETS.hpcl.tntYieldFactor,
                windSpeed: HM.PRESETS.hpcl.windSpeed,
                windDirection: HM.PRESETS.hpcl.windDirection,
                elongationFactor: 0.15,
                layers: {
                    thermal: true,
                    overpressure: true,
                    windVector: true
                }
            };

            this.map = null;
            this.layersGroup = null;
            this.epicenterMarker = null;
            this.sliders = {};
            
            this.init();
        }

        init() {
            this.initMap();
            this.initCompactSliders();
            this.bindGlobalEvents();
            this.updateScenario(true);
        }

        initMap() {
            const mapEl = document.getElementById('threat-zone-map');
            if (!mapEl) return;

            this.map = L.map('threat-zone-map', {
                center: [this.state.lat, this.state.lon],
                zoom: 14,
                zoomControl: false,
                attributionControl: false
            });

            // Add zoom control in bottom right
            L.control.zoom({ position: 'bottomright' }).addTo(this.map);

            // Standard Free OpenStreetMap Tiles (100% Free, No API Key Required)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);

            this.layersGroup = L.layerGroup().addTo(this.map);

            // Click on map to set custom epicenter
            this.map.on('click', (e) => {
                this.state.lat = e.latlng.lat;
                this.state.lon = e.latlng.lng;
                this.state.preset = "custom";
                this.updatePresetButtons();
                this.updateScenario();
            });

            // Trigger resize after load
            setTimeout(() => {
                this.map.invalidateSize();
            }, 250);
        }

        initCompactSliders() {
            // 1. Fuel Mass Slider (Prominent Danger Red)
            this.sliders.fuelMass = new CompactLinearSlider({
                containerId: "slider-fuel-mass",
                label: "Fuel Mass Inventory",
                icon: "🛢️",
                min: 10000,
                max: 10000000,
                step: 50000,
                value: this.state.fuelMassKg,
                unit: "kg",
                variant: "danger",
                scale: "log",
                formatFn: (v) => v >= 1000000 ? `${(v / 1000000).toFixed(2)}M` : `${(v / 1000).toFixed(0)}k`,
                onChange: (val) => {
                    this.state.fuelMassKg = val;
                    this.updateScenario();
                }
            });

            // 2. Heat of Combustion (Warning Amber)
            this.sliders.heatOfCombustion = new CompactLinearSlider({
                containerId: "slider-heat-combustion",
                label: "Heat of Combustion",
                icon: "🔥",
                min: 15.0,
                max: 60.0,
                step: 0.1,
                value: this.state.heatOfCombustion,
                unit: "MJ/kg",
                variant: "warning",
                formatFn: (v) => v.toFixed(1),
                onChange: (val) => {
                    this.state.heatOfCombustion = val;
                    this.updateScenario();
                }
            });

            // 3. Burn Duration (Blue)
            this.sliders.burnDuration = new CompactLinearSlider({
                containerId: "slider-burn-duration",
                label: "Pool Fire Burn Duration",
                icon: "⏱️",
                min: 10,
                max: 300,
                step: 5,
                value: this.state.burnDuration,
                unit: "sec",
                variant: "blue",
                formatFn: (v) => `${v}s`,
                onChange: (val) => {
                    this.state.burnDuration = val;
                    this.updateScenario();
                }
            });

            // 4. Atmospheric Transmissivity (Cyan)
            this.sliders.transmissivity = new CompactLinearSlider({
                containerId: "slider-transmissivity",
                label: "Atmospheric Transmissivity (τ)",
                icon: "🌫️",
                min: 0.30,
                max: 1.00,
                step: 0.02,
                value: this.state.transmissivity,
                unit: "τ",
                variant: "cyan",
                formatFn: (v) => v.toFixed(2),
                onChange: (val) => {
                    this.state.transmissivity = val;
                    this.updateScenario();
                }
            });

            // 5. TNT Yield Equivalence Factor (Purple)
            this.sliders.tntYield = new CompactLinearSlider({
                containerId: "slider-tnt-yield",
                label: "TNT Blast Yield Factor (η)",
                icon: "💥",
                min: 0.02,
                max: 0.50,
                step: 0.01,
                value: this.state.tntYieldFactor,
                unit: "η",
                variant: "purple",
                formatFn: (v) => (v * 100).toFixed(0) + "%",
                onChange: (val) => {
                    this.state.tntYieldFactor = val;
                    this.updateScenario();
                }
            });

            // 6. Wind Speed (Emerald / Cyan)
            this.sliders.windSpeed = new CompactLinearSlider({
                containerId: "slider-wind-speed",
                label: "Ambient Wind Velocity",
                icon: "💨",
                min: 0.0,
                max: 20.0,
                step: 0.2,
                value: this.state.windSpeed,
                unit: "m/s",
                variant: "emerald",
                formatFn: (v) => `${v.toFixed(1)} m/s (${HM.getBeaufortDesc(v)})`,
                onChange: (val) => {
                    this.state.windSpeed = val;
                    this.updateScenario();
                }
            });

            // 7. Wind Direction (Polar Wheel Compass Scrubber)
            this.sliders.windDirection = new CompactPolarCompassSlider({
                containerId: "slider-wind-direction",
                label: "Wind Direction (Blowing Towards)",
                value: this.state.windDirection,
                onChange: (deg) => {
                    this.state.windDirection = deg;
                    this.updateScenario();
                }
            });
        }

        bindGlobalEvents() {
            // Preset Card Clicks
            const presetCards = document.querySelectorAll(".preset-card");
            presetCards.forEach(card => {
                card.addEventListener("click", () => {
                    const presetKey = card.getAttribute("data-preset");
                    this.loadPreset(presetKey);
                });
            });

            // Layer Filter Toggles
            const toggleThermal = document.getElementById("toggle-layer-thermal");
            const toggleBlast = document.getElementById("toggle-layer-blast");
            const toggleWind = document.getElementById("toggle-layer-wind");

            if (toggleThermal) {
                toggleThermal.addEventListener("click", () => {
                    this.state.layers.thermal = !this.state.layers.thermal;
                    toggleThermal.classList.toggle("active", this.state.layers.thermal);
                    this.updateScenario();
                });
            }

            if (toggleBlast) {
                toggleBlast.addEventListener("click", () => {
                    this.state.layers.overpressure = !this.state.layers.overpressure;
                    toggleBlast.classList.toggle("active", this.state.layers.overpressure);
                    this.updateScenario();
                });
            }

            if (toggleWind) {
                toggleWind.addEventListener("click", () => {
                    this.state.layers.windVector = !this.state.layers.windVector;
                    toggleWind.classList.toggle("active", this.state.layers.windVector);
                    this.updateScenario();
                });
            }

            // Export GeoJSON
            const btnExportGeo = document.getElementById("btn-export-geojson");
            if (btnExportGeo) {
                btnExportGeo.addEventListener("click", () => this.exportGeoJSON());
            }

            // Export Report / Print
            const btnPrintReport = document.getElementById("btn-print-report");
            if (btnPrintReport) {
                btnPrintReport.addEventListener("click", () => window.print());
            }

            // Reset Epicenter Button
            const btnResetCenter = document.getElementById("btn-recenter");
            if (btnResetCenter) {
                btnResetCenter.addEventListener("click", () => {
                    this.map.flyTo([this.state.lat, this.state.lon], 14, { duration: 1.2 });
                });
            }

            // Window resize handler for canvas and map
            window.addEventListener("resize", () => {
                if (this.map) this.map.invalidateSize();
                this.renderDecayChart();
            });
        }

        loadPreset(presetKey) {
            if (!HM.PRESETS[presetKey]) return;
            const p = HM.PRESETS[presetKey];
            this.state.preset = presetKey;
            this.state.lat = p.lat;
            this.state.lon = p.lon;
            this.state.fuelMassKg = p.fuelMassKg;
            this.state.heatOfCombustion = p.heatOfCombustion;
            this.state.tntYieldFactor = p.tntYieldFactor;
            this.state.windSpeed = p.windSpeed;
            this.state.windDirection = p.windDirection;
            this.state.burnDuration = p.burnDuration;
            this.state.transmissivity = p.transmissivity;

            // Update Slider UI controls
            this.sliders.fuelMass.setValue(p.fuelMassKg, false);
            this.sliders.heatOfCombustion.setValue(p.heatOfCombustion, false);
            this.sliders.burnDuration.setValue(p.burnDuration, false);
            this.sliders.transmissivity.setValue(p.transmissivity, false);
            this.sliders.tntYield.setValue(p.tntYieldFactor, false);
            this.sliders.windSpeed.setValue(p.windSpeed, false);
            this.sliders.windDirection.setValue(p.windDirection, false);

            this.updatePresetButtons();
            this.map.flyTo([this.state.lat, this.state.lon], 14, { duration: 1.2 });
            this.updateScenario();
        }

        updatePresetButtons() {
            document.querySelectorAll(".preset-card").forEach(card => {
                const key = card.getAttribute("data-preset");
                if (key === this.state.preset) {
                    card.classList.add("active");
                } else {
                    card.classList.remove("active");
                }
            });
        }

        updateScenario(initialZoom = false) {
            if (!this.map || !this.layersGroup) return;
            this.layersGroup.clearLayers();

            // 1. Calculate Base Radii
            const thermalRadii = {};
            for (const [key, band] of Object.entries(HM.THERMAL_BANDS)) {
                thermalRadii[key] = HM.distanceForThermalThreshold(
                    band.threshold, 
                    this.state.fuelMassKg, 
                    this.state.heatOfCombustion, 
                    this.state.burnDuration, 
                    this.state.transmissivity
                );
            }

            const blastRadii = {};
            for (const [key, band] of Object.entries(HM.OVERPRESSURE_BANDS)) {
                blastRadii[key] = HM.distanceForOverpressureThreshold(
                    band.threshold, 
                    this.state.fuelMassKg, 
                    this.state.heatOfCombustion, 
                    this.state.tntYieldFactor
                );
            }

            this.computedData = {
                thermal: {},
                blast: {},
                thermalRadii,
                blastRadii
            };

            // 2. Render Overpressure Zones (Largest to Smallest)
            if (this.state.layers.overpressure) {
                const blastOrder = ["minor_damage", "partial_collapse", "severe_damage"];
                blastOrder.forEach(bandKey => {
                    const band = HM.OVERPRESSURE_BANDS[bandKey];
                    const r = blastRadii[bandKey];
                    const polyCoords = HM.generateWindSkewedZone(
                        this.state.lat, this.state.lon, r,
                        this.state.windDirection, this.state.windSpeed,
                        this.state.elongationFactor
                    );
                    
                    const area = HM.calculatePolygonAreaKm2(polyCoords, this.state.lat);
                    this.computedData.blast[bandKey] = { radius: r, area, polyCoords };

                    const polygon = L.polygon(polyCoords, {
                        color: band.color,
                        weight: 2,
                        opacity: 0.85,
                        fillColor: band.color,
                        fillOpacity: band.fillOpacity,
                        dashArray: '4, 4'
                    }).addTo(this.layersGroup);

                    polygon.bindPopup(`
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; padding: 4px; color: #1D1D1F;">
                            <h4 style="margin: 0 0 4px; color: ${band.color}; font-size: 14px; font-weight: 700;">💥 ${band.name}</h4>
                            <p style="margin: 0 0 6px; font-size: 12px; color: #6E6E73;">${band.desc}</p>
                            <div style="font-size: 11px; background: #F2F2F7; padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06);">
                                <div>Nominal Radius: <strong>${r.toFixed(1)} m</strong></div>
                                <div>Impact Footprint: <strong>${area.toFixed(3)} km²</strong></div>
                            </div>
                        </div>
                    `);
                });
            }

            // 3. Render Thermal Zones (Largest to Smallest)
            if (this.state.layers.thermal) {
                const thermalOrder = ["pain_threshold", "injury_serious", "fatality_high"];
                thermalOrder.forEach(bandKey => {
                    const band = HM.THERMAL_BANDS[bandKey];
                    const r = thermalRadii[bandKey];
                    const polyCoords = HM.generateWindSkewedZone(
                        this.state.lat, this.state.lon, r,
                        this.state.windDirection, this.state.windSpeed,
                        this.state.elongationFactor
                    );
                    
                    const area = HM.calculatePolygonAreaKm2(polyCoords, this.state.lat);
                    this.computedData.thermal[bandKey] = { radius: r, area, polyCoords };

                    const polygon = L.polygon(polyCoords, {
                        color: band.color,
                        weight: 2,
                        opacity: 0.95,
                        fillColor: band.color,
                        fillOpacity: band.fillOpacity
                    }).addTo(this.layersGroup);

                    polygon.bindPopup(`
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; padding: 4px; color: #1D1D1F;">
                            <h4 style="margin: 0 0 4px; color: ${band.color}; font-size: 14px; font-weight: 700;">🔥 ${band.name}</h4>
                            <p style="margin: 0 0 6px; font-size: 12px; color: #6E6E73;">${band.desc}</p>
                            <div style="font-size: 11px; background: #F2F2F7; padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06);">
                                <div>Thermal Flux Limit: <strong>${band.threshold} kW/m²</strong></div>
                                <div>Nominal Radius: <strong>${r.toFixed(1)} m</strong></div>
                                <div>Plume Area: <strong>${area.toFixed(3)} km²</strong></div>
                            </div>
                        </div>
                    `);
                });
            }

            // 4. Render Epicenter Pulse Marker
            const pulseIcon = L.divIcon({
                className: 'pulse-marker-wrapper',
                html: `<div class="pulse-beacon"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            this.epicenterMarker = L.marker([this.state.lat, this.state.lon], { icon: pulseIcon }).addTo(this.layersGroup);
            this.epicenterMarker.bindTooltip(`<strong>Release Epicenter</strong><br>${this.state.lat.toFixed(4)}° N, ${this.state.lon.toFixed(4)}° E`, {
                direction: 'top',
                offset: [0, -10]
            });

            // 5. Render Wind Vector Arrow
            if (this.state.layers.windVector && this.state.windSpeed > 0) {
                const windRad = (this.state.windDirection * Math.PI) / 180.0;
                const maxR = Math.max(thermalRadii.pain_threshold || 100, blastRadii.minor_damage || 100);
                const arrowLenM = maxR * 1.25;
                
                const dx = arrowLenM * Math.sin(windRad);
                const dy = arrowLenM * Math.cos(windRad);
                const endLat = this.state.lat + dy / 111320.0;
                const endLon = this.state.lon + dx / (111320.0 * Math.cos((this.state.lat * Math.PI) / 180.0));

                const arrowLine = L.polyline([[this.state.lat, this.state.lon], [endLat, endLon]], {
                    color: '#0071E3',
                    weight: 2.5,
                    opacity: 0.85,
                    dashArray: '6, 6'
                }).addTo(this.layersGroup);

                arrowLine.bindTooltip(`Wind: ${this.state.windSpeed.toFixed(1)} m/s towards ${this.state.windDirection}° (${HM.getCardinalDirection(this.state.windDirection)})`, {
                    sticky: true
                });
            }

            // Update HUD Overlays & KPIs
            this.updateHUDandKPIs(thermalRadii, blastRadii);
            this.renderDecayChart();
        }

        updateHUDandKPIs(thermalRadii, blastRadii) {
            // Map HUD Chips
            const hudCoords = document.getElementById("hud-coords");
            const hudWind = document.getElementById("hud-wind-summary");
            if (hudCoords) hudCoords.textContent = `${this.state.lat.toFixed(4)}°N, ${this.state.lon.toFixed(4)}°E`;
            if (hudWind) hudWind.textContent = `${this.state.windSpeed.toFixed(1)} m/s · ${this.state.windDirection}° ${HM.getCardinalDirection(this.state.windDirection)}`;

            // Right KPIs
            const fatalR = thermalRadii.fatality_high || 0;
            const severeBlastR = blastRadii.severe_damage || 0;
            const maxPerimeterR = Math.max(thermalRadii.pain_threshold || 0, blastRadii.minor_damage || 0);
            const maxDownwindM = maxPerimeterR * (1.0 + (this.state.elongationFactor * this.state.windSpeed));
            
            const fatalEl = document.getElementById("kpi-fatal-radius");
            const collapseEl = document.getElementById("kpi-collapse-radius");
            const areaEl = document.getElementById("kpi-total-area");
            const downwindEl = document.getElementById("kpi-downwind-reach");

            if (fatalEl) fatalEl.textContent = fatalR.toFixed(0);
            if (collapseEl) collapseEl.textContent = severeBlastR.toFixed(0);
            if (downwindEl) downwindEl.textContent = maxDownwindM.toFixed(0);
            
            if (areaEl) {
                const maxArea = Math.max(
                    (this.computedData.thermal.pain_threshold && this.computedData.thermal.pain_threshold.area) || 0,
                    (this.computedData.blast.minor_damage && this.computedData.blast.minor_damage.area) || 0
                );
                areaEl.textContent = maxArea.toFixed(2);
            }

            // Emergency Recommendations
            const recoIso = document.getElementById("reco-isolation-dist");
            const recoDownwind = document.getElementById("reco-downwind-dist");
            if (recoIso) recoIso.textContent = `${Math.ceil(maxPerimeterR * 1.15)} meters`;
            if (recoDownwind) recoDownwind.textContent = `${Math.ceil(maxDownwindM * 1.25)} meters downwind`;
        }

        renderDecayChart() {
            const canvas = document.getElementById("decay-chart-canvas");
            if (!canvas) return;
            
            const ctx = canvas.getContext("2d");
            const width = canvas.clientWidth || 300;
            const height = canvas.clientHeight || 180;
            
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            ctx.clearRect(0, 0, width, height);

            const padding = { left: 45, right: 20, top: 15, bottom: 25 };
            const chartW = width - padding.left - padding.right;
            const chartH = height - padding.top - padding.bottom;

            const maxDist = Math.max(100, Math.ceil((this.computedData.thermalRadii.pain_threshold || 100) * 1.4));
            const maxFlux = 50.0;

            // Draw grid
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1;
            
            // X Grid lines
            for (let d = 0; d <= maxDist; d += Math.round(maxDist / 4)) {
                const x = padding.left + (d / maxDist) * chartW;
                ctx.beginPath();
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, padding.top + chartH);
                ctx.stroke();

                ctx.fillStyle = "#64748b";
                ctx.font = "9px 'JetBrains Mono', monospace";
                ctx.textAlign = "center";
                ctx.fillText(`${d}m`, x, padding.top + chartH + 15);
            }

            // Y Grid lines
            for (let q = 0; q <= maxFlux; q += 12.5) {
                const y = padding.top + chartH - (q / maxFlux) * chartH;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + chartW, y);
                ctx.stroke();

                ctx.fillStyle = "#64748b";
                ctx.font = "9px 'JetBrains Mono', monospace";
                ctx.textAlign = "right";
                ctx.fillText(`${q.toFixed(0)}`, padding.left - 6, y + 3);
            }

            // Threshold lines
            const y37 = padding.top + chartH - (37.5 / maxFlux) * chartH;
            ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y37);
            ctx.lineTo(padding.left + chartW, y37);
            ctx.stroke();

            const y12 = padding.top + chartH - (12.5 / maxFlux) * chartH;
            ctx.strokeStyle = "rgba(249, 115, 22, 0.4)";
            ctx.beginPath();
            ctx.moveTo(padding.left, y12);
            ctx.lineTo(padding.left + chartW, y12);
            ctx.stroke();

            const y4 = padding.top + chartH - (4.0 / maxFlux) * chartH;
            ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
            ctx.beginPath();
            ctx.moveTo(padding.left, y4);
            ctx.lineTo(padding.left + chartW, y4);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Area Gradient Fill
            ctx.beginPath();
            let startPoint = null;
            const stepM = maxDist / 60;
            for (let d = 5; d <= maxDist; d += stepM) {
                const q = HM.calculateThermalRadiation(
                    d, 
                    this.state.fuelMassKg, 
                    this.state.heatOfCombustion, 
                    this.state.burnDuration, 
                    this.state.transmissivity
                );
                const clampedQ = Math.min(maxFlux, q);
                const x = padding.left + (d / maxDist) * chartW;
                const y = padding.top + chartH - (clampedQ / maxFlux) * chartH;

                if (!startPoint) {
                    startPoint = { x, y };
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            if (startPoint) {
                const lastX = padding.left + chartW;
                ctx.lineTo(lastX, padding.top + chartH);
                ctx.lineTo(startPoint.x, padding.top + chartH);
                ctx.closePath();
                const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
                grad.addColorStop(0, "rgba(0, 240, 255, 0.2)");
                grad.addColorStop(1, "rgba(0, 240, 255, 0.0)");
                ctx.fillStyle = grad;
                ctx.fill();
            }

            // Draw Glowing Cyan Curve Stroke
            ctx.beginPath();
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 8;

            let started = false;
            for (let d = 5; d <= maxDist; d += stepM) {
                const q = HM.calculateThermalRadiation(
                    d, 
                    this.state.fuelMassKg, 
                    this.state.heatOfCombustion, 
                    this.state.burnDuration, 
                    this.state.transmissivity
                );
                const clampedQ = Math.min(maxFlux, q);
                const x = padding.left + (d / maxDist) * chartW;
                const y = padding.top + chartH - (clampedQ / maxFlux) * chartH;

                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        exportGeoJSON() {
            const features = [];
            
            if (this.computedData.thermal) {
                for (const [key, data] of Object.entries(this.computedData.thermal)) {
                    const band = HM.THERMAL_BANDS[key];
                    const geoJsonCoords = data.polyCoords.map(pt => [pt[1], pt[0]]);
                    geoJsonCoords.push(geoJsonCoords[0]);
                    
                    features.push({
                        type: "Feature",
                        properties: {
                            hazard_type: "thermal_radiation",
                            band: key,
                            name: band.name,
                            threshold_kW_m2: band.threshold,
                            nominal_radius_m: data.radius,
                            area_km2: data.area,
                            color: band.color
                        },
                        geometry: {
                            type: "Polygon",
                            coordinates: [geoJsonCoords]
                        }
                    });
                }
            }

            if (this.computedData.blast) {
                for (const [key, data] of Object.entries(this.computedData.blast)) {
                    const band = HM.OVERPRESSURE_BANDS[key];
                    const geoJsonCoords = data.polyCoords.map(pt => [pt[1], pt[0]]);
                    geoJsonCoords.push(geoJsonCoords[0]);
                    
                    features.push({
                        type: "Feature",
                        properties: {
                            hazard_type: "blast_overpressure",
                            band: key,
                            name: band.name,
                            threshold_psi: band.threshold,
                            nominal_radius_m: data.radius,
                            area_km2: data.area,
                            color: band.color
                        },
                        geometry: {
                            type: "Polygon",
                            coordinates: [geoJsonCoords]
                        }
                    });
                }
            }

            features.push({
                type: "Feature",
                properties: {
                    name: "Release Epicenter",
                    fuelMassKg: this.state.fuelMassKg,
                    windSpeedMs: this.state.windSpeed,
                    windDirectionDeg: this.state.windDirection
                },
                geometry: {
                    type: "Point",
                    coordinates: [this.state.lon, this.state.lat]
                }
            });

            const geojsonObj = {
                type: "FeatureCollection",
                metadata: {
                    generator: "DER-02 Threat-Zone Estimation (Approach 2 CompactUI)",
                    timestamp: new Date().toISOString(),
                    scenario: this.state
                },
                features: features
            };

            const blob = new Blob([JSON.stringify(geojsonObj, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `threat_zone_contours_${Date.now()}.geojson`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    // Auto-instantiate when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", () => {
            window.app = new ThreatZoneApp();
        });
    } else {
        window.app = new ThreatZoneApp();
    }
})();
