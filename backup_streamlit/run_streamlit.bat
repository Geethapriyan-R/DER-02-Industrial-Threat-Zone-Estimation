@echo off
title DER-02 Backup Streamlit App
cd /d "%~dp0"
python -m streamlit run streamlit_app.py
pause
