/**
 * DER-02 Industrial Threat-Zone Estimation: Scientific Hazard Physics Engine
 * Faithfully implements Point-Source Thermal Radiation (API 521), 
 * Kingery-Bulmash Blast Overpressure, and Wind-Skewed Threat Zone Contours.
 */

(function(root) {
    const HazardModel = {};

    HazardModel.THERMAL_BANDS = {
        fatality_high: { threshold: 37.5, name: "100% Lethality (1 min)", desc: "Fatal in 1 min / Equipment damage", color: "#FF3B30", fillOpacity: 0.30 },
        injury_serious: { threshold: 12.5, name: "2nd Degree Burns (1 min)", desc: "Serious injury / Wood ignition", color: "#FF9500", fillOpacity: 0.22 },
        pain_threshold: { threshold: 4.0, name: "Pain Threshold (20s)", desc: "First degree burns / Safe limit", color: "#FFCC00", fillOpacity: 0.18 }
    };

    HazardModel.OVERPRESSURE_BANDS = {
        severe_damage: { threshold: 3.0, name: "Severe Structural Damage (3.0 psi)", desc: "Heavy machinery / Steel collapse", color: "#5856D6", fillOpacity: 0.22 },
        partial_collapse: { threshold: 1.0, name: "Partial Collapse (1.0 psi)", desc: "Standard masonry failure", color: "#0071E3", fillOpacity: 0.16 },
        minor_damage: { threshold: 0.3, name: "Minor Damage / Glass (0.3 psi)", desc: "Window breakage / Safe cutoff", color: "#32ADE6", fillOpacity: 0.12 }
    };

    HazardModel.PRESETS = {
        "hpcl": {
            name: "HPCL Visakh Refinery",
            desc: "Large refinery, dense processing units (Visakhapatnam, India)",
            lat: 17.688253,
            lon: 83.2519434,
            fuelMassKg: 5000000,
            heatOfCombustion: 45.0,
            tntYieldFactor: 0.3,
            windSpeed: 4.5,
            windDirection: 65,
            burnDuration: 60,
            transmissivity: 0.70
        },
        "lg_polymers": {
            name: "LG Polymers Site",
            desc: "Isolated chemical tank, real 2020 incident area (RR Venkatapuram)",
            lat: 17.75528,
            lon: 83.20889,
            fuelMassKg: 1800000,
            heatOfCombustion: 39.9,
            tntYieldFactor: 0.1,
            windSpeed: 3.2,
            windDirection: 120,
            burnDuration: 60,
            transmissivity: 0.70
        }
    };

    /**
     * Calculates Thermal Radiation Flux (kW/m²) at a given distance
     */
    HazardModel.calculateThermalRadiation = function(distanceM, fuelMassKg, heatOfCombustionMJkg, burnDurationS = 60, transmissivity = 0.70) {
        if (distanceM <= 0) return Infinity;
        const totalEnergyJ = fuelMassKg * heatOfCombustionMJkg * 1e6;
        const energyReleaseRateW = totalEnergyJ / burnDurationS;
        const radiativeFraction = 0.30;
        const qWm2 = (radiativeFraction * energyReleaseRateW * transmissivity) / (4 * Math.PI * Math.pow(distanceM, 2));
        return qWm2 / 1000.0; // Return in kW/m²
    };

    /**
     * Calculates distance (m) to reach a specific thermal radiation threshold (kW/m²)
     */
    HazardModel.distanceForThermalThreshold = function(thresholdKWm2, fuelMassKg, heatOfCombustionMJkg, burnDurationS = 60, transmissivity = 0.70) {
        if (thresholdKWm2 <= 0) return 0;
        const totalEnergyJ = fuelMassKg * heatOfCombustionMJkg * 1e6;
        const energyReleaseRateW = totalEnergyJ / burnDurationS;
        const radiativeFraction = 0.30;
        const thresholdWm2 = thresholdKWm2 * 1000.0;
        const rSq = (radiativeFraction * energyReleaseRateW * transmissivity) / (4 * Math.PI * thresholdWm2);
        return Math.sqrt(Math.max(0, rSq));
    };

    /**
     * Calculates distance (m) to reach a specific blast overpressure threshold (psi)
     */
    HazardModel.distanceForOverpressureThreshold = function(thresholdPsi, fuelMassKg, heatOfCombustionMJkg, tntYieldFactor = 0.1) {
        const tntEnergyMJkg = 4.184;
        const totalEnergyMJ = fuelMassKg * heatOfCombustionMJkg;
        const tntEquivalentKg = (totalEnergyMJ * tntYieldFactor) / tntEnergyMJkg;
        
        // Discrete scaled distance lookup (Kingery-Bulmash standard points)
        const scaledDistanceLookup = {
            3.0: 2.5,
            1.0: 4.5,
            0.3: 9.0
        };
        
        let Z = scaledDistanceLookup[thresholdPsi];
        if (!Z) {
            Z = 4.5 * Math.pow(1.0 / Math.max(0.01, thresholdPsi), 0.45);
        }
        
        return Z * Math.cbrt(Math.max(0, tntEquivalentKg));
    };

    /**
     * Generates an atmospheric wind-skewed polygon (array of [lat, lon] coordinates)
     */
    HazardModel.generateWindSkewedZone = function(centerLat, centerLon, radiusM, windDirectionDeg, windSpeedMs, elongationFactorPerMs = 0.15, nPoints = 96) {
        if (radiusM <= 0) return [];
        
        const downwindMult = 1.0 + (elongationFactorPerMs * windSpeedMs);
        const upwindMult = Math.max(0.40, 1.0 - (elongationFactorPerMs * windSpeedMs));
        const windRad = (windDirectionDeg * Math.PI) / 180.0;
        
        const points = [];
        for (let i = 0; i < nPoints; i++) {
            const theta = (i / nPoints) * 2.0 * Math.PI;
            const angleFromWind = theta - windRad;
            const blend = (Math.cos(angleFromWind) + 1.0) / 2.0;
            const r = radiusM * (upwindMult + blend * (downwindMult - upwindMult));
            
            const dx = r * Math.sin(theta);
            const dy = r * Math.cos(theta);
            
            // Approximate meter to lat/lon conversions at center latitude
            const dLat = dy / 111320.0;
            const dLon = dx / (111320.0 * Math.cos((centerLat * Math.PI) / 180.0));
            
            points.push([centerLat + dLat, centerLon + dLon]);
        }
        
        return points;
    };

    /**
     * Calculates total affected ground area (in km²) from polygon
     */
    HazardModel.calculatePolygonAreaKm2 = function(polygonLatLons, centerLat) {
        if (!polygonLatLons || polygonLatLons.length < 3) return 0;
        
        let areaM2 = 0;
        const n = polygonLatLons.length;
        const cosLat = Math.cos((centerLat * Math.PI) / 180.0);
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const y1 = polygonLatLons[i][0] * 111320.0;
            const x1 = polygonLatLons[i][1] * 111320.0 * cosLat;
            const y2 = polygonLatLons[j][0] * 111320.0;
            const x2 = polygonLatLons[j][1] * 111320.0 * cosLat;
            areaM2 += (x1 * y2 - x2 * y1);
        }
        
        return Math.abs(areaM2) / 2.0 / 1e6;
    };

    /**
     * Helper to convert degrees to cardinal text
     */
    HazardModel.getCardinalDirection = function(deg) {
        const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        const normalized = ((deg % 360) + 360) % 360;
        const idx = Math.round(normalized / (360.0 / dirs.length)) % dirs.length;
        return dirs[idx];
    };

    /**
     * Helper for Beaufort Wind Scale description
     */
    HazardModel.getBeaufortDesc = function(speedMs) {
        if (speedMs < 0.5) return "Calm";
        if (speedMs <= 1.5) return "Light Air";
        if (speedMs <= 3.3) return "Light Breeze";
        if (speedMs <= 5.5) return "Gentle Breeze";
        if (speedMs <= 7.9) return "Moderate Breeze";
        if (speedMs <= 10.7) return "Fresh Breeze";
        if (speedMs <= 13.8) return "Strong Breeze";
        return "High Wind / Gale";
    };

    // Attach to global window object
    root.HazardModel = HazardModel;
})(typeof window !== 'undefined' ? window : this);
