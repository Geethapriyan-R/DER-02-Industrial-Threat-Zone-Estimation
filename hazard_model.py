import numpy as np
from shapely.geometry import Polygon

def thermal_radiation_kW_m2(distance_m, fuel_mass_kg, heat_of_combustion_MJ_per_kg,
                              emissive_power_kW_m2=150, burn_duration_s=60,
                              atmospheric_transmissivity=0.7):
    total_energy_J = fuel_mass_kg * heat_of_combustion_MJ_per_kg * 1e6
    energy_release_rate_W = total_energy_J / burn_duration_s
    radiative_fraction = 0.3
    q_W_m2 = (radiative_fraction * energy_release_rate_W * atmospheric_transmissivity) / (4 * np.pi * distance_m**2)
    return q_W_m2 / 1000

def distance_for_thermal_threshold(threshold_kW_m2, fuel_mass_kg, heat_of_combustion_MJ_per_kg,
                                     burn_duration_s=60, atmospheric_transmissivity=0.7):
    total_energy_J = fuel_mass_kg * heat_of_combustion_MJ_per_kg * 1e6
    energy_release_rate_W = total_energy_J / burn_duration_s
    radiative_fraction = 0.3
    threshold_W_m2 = threshold_kW_m2 * 1000
    return np.sqrt((radiative_fraction * energy_release_rate_W * atmospheric_transmissivity) / (4 * np.pi * threshold_W_m2))

def distance_for_overpressure_threshold(threshold_psi, fuel_mass_kg, heat_of_combustion_MJ_per_kg,
                                          tnt_equivalence_factor=0.1):
    tnt_energy_MJ_per_kg = 4.184
    total_energy_MJ = fuel_mass_kg * heat_of_combustion_MJ_per_kg
    tnt_equivalent_kg = (total_energy_MJ * tnt_equivalence_factor) / tnt_energy_MJ_per_kg
    scaled_distance_lookup = {3.0: 2.5, 1.0: 4.5, 0.3: 9.0}
    Z = scaled_distance_lookup.get(threshold_psi, 4.5)
    return Z * (tnt_equivalent_kg ** (1/3))

def generate_wind_skewed_zone(center_lat, center_lon, radius_m, wind_direction_deg,
                                wind_speed_ms, elongation_factor_per_ms=0.15, n_points=96):
    downwind_mult = 1 + (elongation_factor_per_ms * wind_speed_ms)
    upwind_mult = max(0.4, 1 - (elongation_factor_per_ms * wind_speed_ms))
    wind_rad = np.radians(wind_direction_deg)
    angles = np.linspace(0, 2 * np.pi, n_points, endpoint=False)
    points = []
    for theta in angles:
        angle_from_wind = theta - wind_rad
        blend = (np.cos(angle_from_wind) + 1) / 2
        r = radius_m * (upwind_mult + blend * (downwind_mult - upwind_mult))
        dx = r * np.sin(theta)
        dy = r * np.cos(theta)
        d_lat = dy / 111320
        d_lon = dx / (111320 * np.cos(np.radians(center_lat)))
        points.append((center_lon + d_lon, center_lat + d_lat))
    return Polygon(points)

THERMAL_BANDS_kW_m2 = {"fatality_high": 37.5, "injury_serious": 12.5, "pain_threshold": 4.0}
OVERPRESSURE_BANDS_psi = {"severe_damage": 3.0, "partial_collapse": 1.0, "minor_damage": 0.3}
THERMAL_COLORS = {"pain_threshold": "#FAC775", "injury_serious": "#F0997B", "fatality_high": "#E24B4A"}
OVERPRESSURE_COLORS = {"minor_damage": "#85B7EB", "partial_collapse": "#378ADD", "severe_damage": "#185FA5"}
