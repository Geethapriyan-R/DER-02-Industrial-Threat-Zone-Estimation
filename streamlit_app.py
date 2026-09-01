import streamlit as st
import folium
from streamlit_folium import st_folium
import math
import time
import random
from datetime import datetime
from hazard_model import (
    distance_for_thermal_threshold, distance_for_overpressure_threshold,
    generate_wind_skewed_zone, THERMAL_BANDS_kW_m2, OVERPRESSURE_BANDS_psi,
    THERMAL_COLORS, OVERPRESSURE_COLORS
)

# Page configuration
st.set_page_config(
    page_title="DER-02: Industrial Threat-Zone Estimation",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Session State for Simulated Gas Leak Detection Feed
if "sensor_ppm" not in st.session_state:
    st.session_state.sensor_ppm = 218.0
if "sensor_prev_ppm" not in st.session_state:
    st.session_state.sensor_prev_ppm = 210.0
if "sensor_alert" not in st.session_state:
    st.session_state.sensor_alert = False
if "alert_timestamp" not in st.session_state:
    st.session_state.alert_timestamp = None
if "last_auto_cycle" not in st.session_state:
    st.session_state.last_auto_cycle = time.time()
if "auto_loop_active" not in st.session_state:
    st.session_state.auto_loop_active = True
if "event_logs" not in st.session_state:
    st.session_state.event_logs = [
        {
            "time": datetime.now().strftime("%H:%M:%S"),
            "ppm": 218.0,
            "status": "NOMINAL",
            "action": "Sensor telemetry online. Baseline nominal."
        }
    ]

# Custom High-Tech Styling (Modern Glassmorphism & Cyber-Industrial UI)
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');

    /* Global Typography & Background */
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .stApp {
        background: radial-gradient(circle at 10% 20%, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 90.2%);
        color: #f1f5f9;
    }

    /* Main Container Padding */
    .block-container {
        padding-top: 1.5rem;
        padding-bottom: 3rem;
        max-width: 98% !important;
    }

    /* Custom Header Card */
    .app-header {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 4px solid #00f0ff;
        border-radius: 14px;
        padding: 18px 24px;
        margin-bottom: 18px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(16px);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
    }

    .app-header.alert-mode {
        border-left: 4px solid #ef4444 !important;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%) !important;
        box-shadow: 0 0 30px rgba(239, 68, 68, 0.3) !important;
    }

    .app-title {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .app-subtitle {
        color: #94a3b8;
        font-size: 13px;
        margin-top: 4px;
        font-weight: 400;
    }

    .status-badge-container {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        font-family: 'JetBrains Mono', monospace;
    }

    .badge-live {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-alert {
        background: rgba(239, 68, 68, 0.25) !important;
        color: #fca5a5 !important;
        border: 1px solid #ef4444 !important;
        animation: pulseAlertBadge 1.2s infinite alternate;
    }

    @keyframes pulseAlertBadge {
        0% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.4); }
        100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); }
    }

    .badge-model {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
    }

    /* Live Emergency Broadcast Alert Banner */
    .critical-banner {
        background: linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.12) 100%);
        border: 1.5px solid #ef4444;
        border-radius: 12px;
        padding: 14px 20px;
        margin-bottom: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #fee2e2;
        box-shadow: 0 0 25px rgba(239, 68, 68, 0.3);
    }

    /* KPI Metric Cards */
    .kpi-card {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 14px 16px;
        transition: transform 0.2s ease, border-color 0.2s ease;
        backdrop-filter: blur(10px);
        margin-bottom: 10px;
    }

    .kpi-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.15);
    }

    .kpi-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .kpi-value {
        font-size: 22px;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: -0.02em;
    }

    .kpi-desc {
        font-size: 11px;
        color: #64748b;
        margin-top: 3px;
    }

    /* Sidebar Custom Styling */
    section[data-testid="stSidebar"] {
        background-color: #080c16 !important;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    section[data-testid="stSidebar"] .block-container {
        padding-top: 2rem !important;
    }

    .sensor-live-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #00f0ff;
        margin-bottom: 6px;
    }

    .sensor-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #00f0ff;
        box-shadow: 0 0 8px #00f0ff;
        display: inline-block;
        animation: sensorPulseAnim 1.5s infinite;
    }

    @keyframes sensorPulseAnim {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(1.3); }
    }

    /* Section Cards */
    .section-box {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
    }

    .section-title {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #cbd5e1;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    /* Legend Items */
    .legend-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
        margin-right: 8px;
        margin-bottom: 8px;
    }

    .color-dot {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
    }

    /* Wind Compass Pill */
    .compass-indicator {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        background: rgba(59, 130, 246, 0.1);
        color: #60a5fa;
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid rgba(59, 130, 246, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 4px;
    }
</style>
""", unsafe_allow_html=True)

# Facility Configurations (EXACT PRESERVATION OF ORIGINAL VALUES)
CONFIGS = {
    "Config 1: HPCL Visakh Refinery (large, congested)": {
        "lat": 17.688253, "lon": 83.2519434,
        "fuel_mass_kg": 5_000_000, "heat_of_combustion_MJ_per_kg": 45,
        "tnt_yield_factor": 0.3,
    },
    "Config 2: LG Polymers site (isolated tank, real 2020 incident)": {
        "lat": 17.75528, "lon": 83.20889,
        "fuel_mass_kg": 1_800_000, "heat_of_combustion_MJ_per_kg": 39.9,
        "tnt_yield_factor": 0.1,
    },
}

# Helper function for wind direction cardinal label
def get_cardinal_direction(deg):
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = round(deg / (360.0 / len(dirs))) % len(dirs)
    return dirs[ix]

# Helper function for beaufort scale
def get_beaufort_desc(speed_ms):
    if speed_ms < 0.5: return "Calm"
    elif speed_ms <= 1.5: return "Light Air"
    elif speed_ms <= 3.3: return "Light Breeze"
    elif speed_ms <= 5.4: return "Gentle Breeze"
    elif speed_ms <= 7.9: return "Moderate Breeze"
    elif speed_ms <= 10.7: return "Fresh Breeze"
    elif speed_ms <= 13.8: return "Strong Breeze"
    else: return "Near Gale"

# Sidebar Controls
with st.sidebar:
    # =========================================================================
    # 1. LIVE SENSOR FEED CARD (Positioned Above Scenario Controls)
    # =========================================================================
    st.markdown("### 📡 Live Sensor Feed")
    
    # Sensor Feed Fragment with auto-tick
    @st.fragment(run_every="2s")
    def render_live_sensor_feed():
        now = time.time()
        # Periodic auto-tick simulation when active
        if st.session_state.auto_loop_active:
            # Check 25s auto-spike cycle
            if not st.session_state.sensor_alert and (now - st.session_state.last_auto_cycle > 28.0):
                # Auto-spike event
                st.session_state.sensor_prev_ppm = st.session_state.sensor_ppm
                st.session_state.sensor_ppm = round(random.uniform(1180.0, 1520.0), 1)
                st.session_state.sensor_alert = True
                st.session_state.alert_timestamp = datetime.now().strftime("%H:%M:%S")
                st.session_state.last_auto_cycle = now
                st.session_state.event_logs.insert(0, {
                    "time": st.session_state.alert_timestamp,
                    "ppm": st.session_state.sensor_ppm,
                    "status": "AUTO-LEAK",
                    "action": "Sensor breached 1000 ppm threshold. Hazard zone auto-calculated."
                })
                st.rerun()
            else:
                # User exact sensor update formula:
                max_change = 200.0
                delta = (random.random() * 2 - 1) * max_change
                new_reading = st.session_state.sensor_ppm + delta
                new_reading = max(0.0, new_reading)
                new_reading = min(new_reading, 2000.0) if st.session_state.sensor_alert else min(new_reading, 450.0)
                st.session_state.sensor_prev_ppm = st.session_state.sensor_ppm
                st.session_state.sensor_ppm = round(new_reading, 1)

        diff = st.session_state.sensor_ppm - st.session_state.sensor_prev_ppm
        
        # Bordered Container
        with st.container(border=True):
            if st.session_state.sensor_alert:
                st.error(f"🚨 **LEAK DETECTED** (@{st.session_state.alert_timestamp})")
            else:
                st.markdown('<div class="sensor-live-indicator"><span class="sensor-pulse-dot"></span> LIVE PID TELEMETRY</div>', unsafe_allow_html=True)

            delta_str = f"{diff:+.1f} ppm" if abs(diff) > 0.4 else "Stable"
            st.metric(
                label="LPG / Hydrocarbon Concentration",
                value=f"{st.session_state.sensor_ppm:.1f} ppm",
                delta=delta_str,
                delta_color="inverse" if diff > 0.4 else "normal"
            )
            st.caption("Threshold: **1,000 ppm** | Baseline: **50–400 ppm**")

            # Control buttons
            btn_col1, btn_col2 = st.columns(2)
            with btn_col1:
                if st.button("⚡ Simulate", use_container_width=True, type="primary", help="Trigger instantaneous gas leak spike (>1000 ppm)"):
                    st.session_state.sensor_prev_ppm = st.session_state.sensor_ppm
                    st.session_state.sensor_ppm = round(random.uniform(1320.0, 1680.0), 1)
                    st.session_state.sensor_alert = True
                    st.session_state.alert_timestamp = datetime.now().strftime("%H:%M:%S")
                    st.session_state.event_logs.insert(0, {
                        "time": st.session_state.alert_timestamp,
                        "ppm": st.session_state.sensor_ppm,
                        "status": "LEAK DETECTED",
                        "action": "Manual trigger: Leak threshold crossed. Hazard zone auto-calculated."
                    })
                    st.rerun()

            with btn_col2:
                if st.button("🔄 Reset", use_container_width=True, help="Clear leak alarm and return gas concentration to nominal baseline"):
                    st.session_state.sensor_prev_ppm = st.session_state.sensor_ppm
                    st.session_state.sensor_ppm = round(random.uniform(190.0, 230.0), 1)
                    st.session_state.sensor_alert = False
                    st.session_state.alert_timestamp = None
                    st.session_state.last_auto_cycle = time.time()
                    st.session_state.event_logs.insert(0, {
                        "time": datetime.now().strftime("%H:%M:%S"),
                        "ppm": st.session_state.sensor_ppm,
                        "status": "RESET",
                        "action": "Telemetry reset to nominal background. Threat zone cleared."
                    })
                    st.rerun()

            with st.expander("📋 Incident Event Log", expanded=st.session_state.sensor_alert):
                for entry in st.session_state.event_logs[:5]:
                    entry_color = "#fca5a5" if entry.get("status") in ["LEAK DETECTED", "AUTO-LEAK"] else "#94a3b8"
                    st.markdown(f"<div style='font-family:monospace; font-size:10.5px; color:{entry_color}; padding:2px 0;'><b>[{entry['time']}]</b> {entry['ppm']:.0f} ppm: {entry['action']}</div>", unsafe_allow_html=True)

            st.session_state.auto_loop_active = st.toggle("🔄 Live Telemetry (2s)", value=st.session_state.auto_loop_active)

    render_live_sensor_feed()

    st.markdown("---")
    st.markdown("### 🎛️ Scenario Controls")
    
    selected_config_name = st.selectbox(
        "Facility Configuration",
        list(CONFIGS.keys()),
        index=0,
        help="Select industrial site to simulate potential vapor cloud explosion & pool fire hazard radii."
    )
    
    cfg = CONFIGS[selected_config_name]

    # Facility Snapshot
    with st.expander("📍 Facility Inventory Details", expanded=False):
        st.markdown(f"**Latitude:** `{cfg['lat']:.6f}`")
        st.markdown(f"**Longitude:** `{cfg['lon']:.6f}`")
        st.markdown(f"**Fuel Mass:** `{cfg['fuel_mass_kg']:,} kg` ({cfg['fuel_mass_kg']/1000:,.0f} t)")
        st.markdown(f"**Heat of Combustion:** `{cfg['heat_of_combustion_MJ_per_kg']} MJ/kg`")
        st.markdown(f"**TNT Yield Factor:** `{cfg['tnt_yield_factor']}`")
        total_energy_gj = (cfg['fuel_mass_kg'] * cfg['heat_of_combustion_MJ_per_kg']) / 1000
        tnt_equiv_tons = ((cfg['fuel_mass_kg'] * cfg['heat_of_combustion_MJ_per_kg'] * cfg['tnt_yield_factor']) / 4.184) / 1000
        st.markdown(f"**Total Energy Release:** `{total_energy_gj:,.0f} GJ`")
        st.markdown(f"**TNT Equivalent:** `{tnt_equiv_tons:,.2f} metric tons`")

    st.markdown("---")
    st.markdown("### 🌬️ Atmospheric Conditions")

    wind_speed = st.slider(
        "Wind speed (m/s)",
        min_value=0, max_value=15, value=8, step=1,
        help="Surface wind velocity modifying plume elongation."
    )
    
    wind_kmh = wind_speed * 3.6
    beaufort = get_beaufort_desc(wind_speed)
    st.caption(f"Velocity: **{wind_kmh:.1f} km/h** | Scale: **{beaufort}**")

    wind_direction = st.slider(
        "Wind direction (° from North, blowing toward)",
        min_value=0, max_value=360, value=90, step=5,
        help="Heading angle (degrees) where the hazard plume is driven toward."
    )
    cardinal = get_cardinal_direction(wind_direction)
    st.markdown(f"""
    <div class="compass-indicator">
        <span>Blowing Direction:</span>
        <span><b>{wind_direction}° ({cardinal})</b> ➔</span>
    </div>
    """, unsafe_allow_html=True)

    # Elongation factors display
    downwind_factor = 1 + (0.15 * wind_speed)
    upwind_factor = max(0.4, 1 - (0.15 * wind_speed))
    st.markdown(f"""
    <div style="font-size: 11.5px; color: #94a3b8; margin-top: 8px;">
        Downwind Stretch: <b style="color:#60a5fa">+{((downwind_factor-1)*100):.0f}%</b> | 
        Upwind Compression: <b style="color:#f87171">{(upwind_factor*100):.0f}%</b>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### 🗺️ Map Display Options")
    map_style = st.selectbox(
        "Basemap Theme",
        ["OpenStreetMap (Free / No Key Required)", "CartoDB Dark Matter", "CartoDB Positron"],
        index=0
    )
    
    col_t1, col_t2 = st.columns(2)
    with col_t1:
        show_thermal = st.checkbox("Show Thermal", value=True)
    with col_t2:
        show_blast = st.checkbox("Show Overpressure", value=True)

# Main Dashboard Header
is_alert_mode = st.session_state.sensor_alert
header_extra_class = " alert-mode" if is_alert_mode else ""
status_badge_html = f'<span class="status-badge badge-alert">🚨 LEAK DETECTED ({st.session_state.sensor_ppm:.0f} ppm)</span>' if is_alert_mode else '<span class="status-badge badge-live">● REAL-TIME DISPERSION</span>'

st.markdown(f"""
<div class="app-header{header_extra_class}">
    <div>
        <div class="app-title">
            <span>🛡️</span> DER-02: Industrial Threat-Zone Estimation
        </div>
        <div class="app-subtitle">
            Point-Source Thermal Radiation (API 521) & TNT-Equivalent Blast Overpressure (Kingery-Bulmash)
        </div>
    </div>
    <div class="status-badge-container">
        {status_badge_html}
        <span class="status-badge badge-model">API 521 / TNT KB</span>
    </div>
</div>
""", unsafe_allow_html=True)

# Broadcast Alert Banner across top if sensor triggered
if is_alert_mode:
    st.markdown(f"""
    <div class="critical-banner">
        <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:24px;">🚨</span>
            <div>
                <div style="font-weight:800; font-size:14px; letter-spacing:0.02em;">CRITICAL GAS LEAK DETECTED — HAZARD ZONE AUTO-CALCULATED</div>
                <div style="font-size:12px; color:#fca5a5; margin-top:2px;">
                    Sensor concentration reached <b>{st.session_state.sensor_ppm:.1f} ppm</b> (Threshold >1,000 ppm) at <b>{st.session_state.alert_timestamp}</b>. Threat envelope auto-projected for <b>{selected_config_name}</b>.
                </div>
            </div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:12px; background:rgba(239,68,68,0.35); padding:6px 12px; border-radius:6px; border:1px solid #ef4444;">
            AUTO-DISPATCH READY
        </div>
    </div>
    """, unsafe_allow_html=True)

# EXACT MODEL CALCULATIONS PRESERVATION
thermal_zones = {}
thermal_radii = {}
for label, threshold in THERMAL_BANDS_kW_m2.items():
    r = distance_for_thermal_threshold(threshold, cfg["fuel_mass_kg"], cfg["heat_of_combustion_MJ_per_kg"])
    thermal_radii[label] = r
    thermal_zones[label] = generate_wind_skewed_zone(cfg["lat"], cfg["lon"], r, wind_direction, wind_speed)

overpressure_zones = {}
overpressure_radii = {}
for label, threshold in OVERPRESSURE_BANDS_psi.items():
    r = distance_for_overpressure_threshold(threshold, cfg["fuel_mass_kg"], cfg["heat_of_combustion_MJ_per_kg"],
                                              tnt_equivalence_factor=cfg["tnt_yield_factor"])
    overpressure_radii[label] = r
    overpressure_zones[label] = generate_wind_skewed_zone(cfg["lat"], cfg["lon"], r, wind_direction, wind_speed)

# Top Metrics Row (Calculated Threat Radii)
mcol1, mcol2, mcol3, mcol4, mcol5, mcol6 = st.columns(6)

with mcol1:
    st.markdown(f"""
    <div class="kpi-card" style="border-top: 3px solid {THERMAL_COLORS['fatality_high']};">
        <div class="kpi-title"><span style="color:{THERMAL_COLORS['fatality_high']}">■</span> High Fatality</div>
        <div class="kpi-value" style="color:{THERMAL_COLORS['fatality_high']};">{thermal_radii['fatality_high']:.0f} m</div>
        <div class="kpi-desc">37.5 kW/m² thermal</div>
    </div>
    """, unsafe_allow_html=True)

with mcol2:
    st.markdown(f"""
    <div class="kpi-card" style="border-top: 3px solid {THERMAL_COLORS['injury_serious']};">
        <div class="kpi-title"><span style="color:{THERMAL_COLORS['injury_serious']}">■</span> Serious Injury</div>
        <div class="kpi-value" style="color:{THERMAL_COLORS['injury_serious']};">{thermal_radii['injury_serious']:.0f} m</div>
        <div class="kpi-desc">12.5 kW/m² (2nd deg)</div>
    </div>
    """, unsafe_allow_html=True)

with mcol3:
    st.markdown(f"""
    <div class="kpi-card" style="border-top: 3px solid {THERMAL_COLORS['pain_threshold']};">
        <div class="kpi-title"><span style="color:{THERMAL_COLORS['pain_threshold']}">■</span> Pain Threshold</div>
        <div class="kpi-value" style="color:{THERMAL_COLORS['pain_threshold']};">{thermal_radii['pain_threshold']:.0f} m</div>
        <div class="kpi-desc">4.0 kW/m² limit</div>
    </div>
    """, unsafe_allow_html=True)

with mcol4:
    st.markdown(f"""
    <div class="kpi-card" style="border-top: 3px dashed {OVERPRESSURE_COLORS['severe_damage']};">
        <div class="kpi-title"><span style="color:{OVERPRESSURE_COLORS['severe_damage']}">⬡</span> Severe Damage</div>
        <div class="kpi-value" style="color:{OVERPRESSURE_COLORS['severe_damage']};">{overpressure_radii['severe_damage']:.0f} m</div>
        <div class="kpi-desc">3.0 psi blast shock</div>
    </div>
    """, unsafe_allow_html=True)

with mcol5:
    st.markdown(f"""
    <div class="kpi-card" style="border-top: 3px dashed {OVERPRESSURE_COLORS['partial_collapse']};">
        <div class="kpi-title"><span style="color:{OVERPRESSURE_COLORS['partial_collapse']}">⬡</span> Partial Collapse</div>
        <div class="kpi-value" style="color:{OVERPRESSURE_COLORS['partial_collapse']};">{overpressure_radii['partial_collapse']:.0f} m</div>
        <div class="kpi-desc">1.0 psi structural</div>
    </div>
    """, unsafe_allow_html=True)

with mcol6:
    st.markdown(f"""
    <div class="kpi-card" style="border-top: 3px dashed {OVERPRESSURE_COLORS['minor_damage']};">
        <div class="kpi-title"><span style="color:{OVERPRESSURE_COLORS['minor_damage']}">⬡</span> Minor Damage</div>
        <div class="kpi-value" style="color:{OVERPRESSURE_COLORS['minor_damage']};">{overpressure_radii['minor_damage']:.0f} m</div>
        <div class="kpi-desc">0.3 psi glass shatter</div>
    </div>
    """, unsafe_allow_html=True)

# Layout: Map in main view with interactive Folium
map_tiles_dict = {
    "OpenStreetMap (Free / No Key Required)": "OpenStreetMap",
    "CartoDB Dark Matter": "CartoDB dark_matter",
    "CartoDB Positron": "CartoDB positron"
}

chosen_tile = map_tiles_dict.get(map_style, "OpenStreetMap")

m = folium.Map(
    location=[cfg["lat"], cfg["lon"]],
    zoom_start=14,
    tiles=chosen_tile
)

# Facility epicenter marker
marker_icon_color = "red" if not is_alert_mode else "darkred"
folium.Marker(
    [cfg["lat"], cfg["lon"]],
    popup=folium.Popup(f"""
        <b>{selected_config_name}</b><br>
        <b>Status:</b> {'🚨 EMERGENCY LEAK DETECTED' if is_alert_mode else 'Active Monitoring'}<br>
        <b>Lat:</b> {cfg['lat']:.5f}, <b>Lon:</b> {cfg['lon']:.5f}<br>
        <b>Fuel:</b> {cfg['fuel_mass_kg']:,} kg<br>
        <b>Yield Factor:</b> {cfg['tnt_yield_factor']}
    """, max_width=300),
    tooltip=f"{'🚨 LEAK ORIGIN: ' if is_alert_mode else 'Incident Origin: '}{selected_config_name}",
    icon=folium.Icon(color=marker_icon_color, icon="fire" if not is_alert_mode else "exclamation-triangle", prefix="fa")
).add_to(m)

# Thermal polygons
if show_thermal:
    for label in ["pain_threshold", "injury_serious", "fatality_high"]:
        poly = thermal_zones[label]
        coords = [(lat, lon) for lon, lat in poly.exterior.coords]
        folium.Polygon(
            locations=coords,
            color=THERMAL_COLORS[label],
            fill=True,
            fill_color=THERMAL_COLORS[label],
            fill_opacity=0.35,
            weight=1.5,
            popup=f"Thermal: {label.replace('_', ' ').title()} ({THERMAL_BANDS_kW_m2[label]} kW/m² | Base R: {thermal_radii[label]:.1f}m)",
            tooltip=f"Thermal Zone: {label} ({THERMAL_BANDS_kW_m2[label]} kW/m²)"
        ).add_to(m)

# Overpressure polygons
if show_blast:
    for label in ["minor_damage", "partial_collapse", "severe_damage"]:
        poly = overpressure_zones[label]
        coords = [(lat, lon) for lon, lat in poly.exterior.coords]
        folium.Polygon(
            locations=coords,
            color=OVERPRESSURE_COLORS[label],
            fill=False,
            weight=2.5,
            dash_array="8,6",
            popup=f"Blast Overpressure: {label.replace('_', ' ').title()} ({OVERPRESSURE_BANDS_psi[label]} psi | Base R: {overpressure_radii[label]:.1f}m)",
            tooltip=f"Overpressure Zone: {label} ({OVERPRESSURE_BANDS_psi[label]} psi)"
        ).add_to(m)

# Wind vector indicator on map
wind_rad = math.radians(wind_direction)
arrow_dist_m = max(thermal_radii['pain_threshold'], overpressure_radii['minor_damage']) * 0.8
arrow_dlat = (arrow_dist_m * math.cos(wind_rad)) / 111320
arrow_dlon = (arrow_dist_m * math.sin(wind_rad)) / (111320 * math.cos(math.radians(cfg['lat'])))

folium.PolyLine(
    locations=[[cfg["lat"], cfg["lon"]], [cfg["lat"] + arrow_dlat, cfg["lon"] + arrow_dlon]],
    color="#38bdf8",
    weight=2,
    dash_array="4,4",
    tooltip=f"Wind Vector ({wind_speed} m/s blowing @ {wind_direction}°)"
).add_to(m)

# Render map
st_folium(m, width=None, height=620, use_container_width=True)

# Legend & Hazard Severity Spectrum
leg_col1, leg_col2 = st.columns(2)

with leg_col1:
    st.markdown("""
    <div class="section-box">
        <div class="section-title">🔥 Thermal Radiation Bands (API 521 Point-Source)</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <div class="legend-chip">
                <span class="color-dot" style="background:#E24B4A;"></span>
                <span><b>Fatality High</b> (37.5 kW/m²) — 100% lethality in 1 min</span>
            </div>
            <div class="legend-chip">
                <span class="color-dot" style="background:#F0997B;"></span>
                <span><b>Serious Injury</b> (12.5 kW/m²) — 2nd degree burn within 10-20s</span>
            </div>
            <div class="legend-chip">
                <span class="color-dot" style="background:#FAC775;"></span>
                <span><b>Pain Threshold</b> (4.0 kW/m²) — Escape threshold within 20s</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

with leg_col2:
    st.markdown("""
    <div class="section-box">
        <div class="section-title">💥 Blast Overpressure Bands (Kingery-Bulmash Scaled Distance)</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <div class="legend-chip">
                <span class="color-dot" style="background:#185FA5; border: 1px dashed #ffffff;"></span>
                <span><b>Severe Damage</b> (3.0 psi) — Heavy structural collapse</span>
            </div>
            <div class="legend-chip">
                <span class="color-dot" style="background:#378ADD; border: 1px dashed #ffffff;"></span>
                <span><b>Partial Collapse</b> (1.0 psi) — Walls cracked, roof displacements</span>
            </div>
            <div class="legend-chip">
                <span class="color-dot" style="background:#85B7EB; border: 1px dashed #ffffff;"></span>
                <span><b>Minor Damage</b> (0.3 psi) — Glass breakage, secondary injuries</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

# Technical Model Reference Expander
with st.expander("📐 Technical Formulation & Standards Documentation", expanded=False):
    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown("**API 521 Thermal Radiation**")
        st.latex(r"q = \frac{\eta \cdot \dot{Q} \cdot \tau_a}{4 \pi R^2}")
        st.caption("Where $\\eta=0.3$ is radiative fraction, $\\dot{Q}$ is heat release rate, $\\tau_a=0.7$ is transmissivity.")
    with c2:
        st.markdown("**TNT Equivalence Overpressure**")
        st.latex(r"W_{\text{TNT}} = \frac{M_{\text{fuel}} \cdot \Delta H_c \cdot \alpha}{4.184}")
        st.latex(r"R = Z \cdot (W_{\text{TNT}})^{1/3}")
        st.caption("Kingery-Bulmash scaled distance lookup $Z \\in \\{2.5, 4.5, 9.0\\}$ for thresholds $3.0, 1.0, 0.3\\text{ psi}$.")
    with c3:
        st.markdown("**Wind-Skewed Geometry**")
        st.latex(r"r(\theta) = R \cdot [m_{\text{up}} + \text{blend}(\theta) \cdot (m_{\text{down}} - m_{\text{up}})]")
        st.caption("Elongates downwind with factor $0.15 \\times v_{\\text{wind}}$ and contracts upwind bound at $\\ge 0.4$.")

st.markdown("---")
st.caption("Model: point-source thermal radiation (API 521-style) + TNT-equivalent overpressure "
           "(Kingery-Bulmash scaled distance). Zones are wind-skewed, not fixed-radius circles.")
