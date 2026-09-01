# DER-02: Industrial Threat-Zone Estimation

Interactive real-time threat-zone estimation system for industrial hazardous events.

## 🚀 Live Demo
- **HTML5 Interactive Dashboard**: Open [`demo/der-02-threat-zone-map.html`](demo/der-02-threat-zone-map.html) directly in any web browser.
- Features: Leaflet map integration, CompactSlider controls, API 521 point-source thermal radiation, Kingery-Bulmash blast overpressure, GeoJSON export, and incident reporting.

## 📁 Repository Structure
```
DER-02_FINAL/
├── demo/
│   ├── der-02-threat-zone-map.html   # Standalone interactive map & calculation UI
│   ├── styles.css                    # Modern cyber-industrial styling
│   ├── hazard_model.js               # Dispersion & physics computation engine
│   ├── compact-slider.js             # Slider controls
│   └── app.js                        # Map controller & event handlers
├── backup_streamlit/
│   ├── streamlit_app.py              # Python / Streamlit interactive dashboard backup
│   ├── hazard_model.py               # Python physics dispersion models
│   ├── requirements.txt              # Dependencies for Streamlit
│   └── run_streamlit.bat             # 1-click launcher for Streamlit
└── run_demo.bat                      # 1-click launcher for demo in browser
```

## 🛠️ Requirements (For Streamlit Backup)
```bash
pip install -r backup_streamlit/requirements.txt
streamlit run backup_streamlit/streamlit_app.py
```
