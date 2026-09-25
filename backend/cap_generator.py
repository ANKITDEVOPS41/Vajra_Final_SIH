import datetime
import xml.etree.ElementTree as ET
from typing import Any


def generate_cap_xml(cell_id: str, hazard_data: dict[str, Any], coordinates: tuple = (21.0, 84.0)) -> str:
    """
    Generates a formalized NDMA Common Alerting Protocol (CAP v1.2 XML)
    warning message for dissemination to disaster management authorities.
    """
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
    sent_time = now.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    
    # Determine Severity and Certainty
    rain = hazard_data.get("rain_rate_mmh", 0)
    wind = hazard_data.get("downburst_gust_kmh", 0)
    posh = hazard_data.get("posh_percent", 0)
    
    severity = "Minor"
    urgency = "Expected"
    headline = f"Monitoring: Convective Cell {cell_id}"
    descriptions = []
    
    if rain >= 100 or wind >= 90 or posh >= 60:
        severity = "Extreme"
        urgency = "Immediate"
        headline = f"IMMEDIATE HAZARD: Severe Convective Storm Cell {cell_id}"
        if rain >= 100: descriptions.append(f"Cloudburst detected with rain rate {rain} mm/hr.")
        if wind >= 90: descriptions.append(f"Destructive downburst gusts up to {wind} km/h.")
        if posh >= 60: descriptions.append(f"High probability of severe hail (POSH: {posh}%).")
    elif rain >= 50 or wind >= 60 or posh >= 30:
        severity = "Severe"
        urgency = "Expected"
        headline = f"SEVERE WEATHER WARNING: Convective Cell {cell_id}"
        if rain >= 50: descriptions.append(f"Heavy rain rate {rain} mm/hr.")
        if wind >= 60: descriptions.append(f"Severe gusts up to {wind} km/h.")
        if posh >= 30: descriptions.append("Moderate hail risk.")
    else:
        descriptions.append("Standard convective precipitation. No immediate extreme hazard.")

    desc_text = " ".join(descriptions)
    
    alert = ET.Element("alert", xmlns="urn:oasis:names:tc:emergency:cap:1.2")
    
    identifier = ET.SubElement(alert, "identifier")
    identifier.text = f"CONVECTNOW-ALERT-{cell_id}-{now.strftime('%Y%m%d%H%M%S')}"
    
    sender = ET.SubElement(alert, "sender")
    sender.text = "ncrmwf.nowcast@moes.gov.in"
    
    sent = ET.SubElement(alert, "sent")
    sent.text = sent_time
    
    status = ET.SubElement(alert, "status")
    status.text = "Actual"
    
    msgType = ET.SubElement(alert, "msgType")
    msgType.text = "Alert"
    
    scope = ET.SubElement(alert, "scope")
    scope.text = "Public"
    
    info = ET.SubElement(alert, "info")
    
    category = ET.SubElement(info, "category")
    category.text = "Met"
    
    event = ET.SubElement(info, "event")
    event.text = "Severe Thunderstorm Warning"
    
    responseType = ET.SubElement(info, "responseType")
    responseType.text = "Shelter"
    
    urgency_el = ET.SubElement(info, "urgency")
    urgency_el.text = urgency
    
    severity_el = ET.SubElement(info, "severity")
    severity_el.text = severity
    
    certainty_el = ET.SubElement(info, "certainty")
    certainty_el.text = "Observed"
    
    eventCode = ET.SubElement(info, "eventCode")
    valueName = ET.SubElement(eventCode, "valueName")
    valueName.text = "SAME"
    value = ET.SubElement(eventCode, "value")
    value.text = "SVR"
    
    headline_el = ET.SubElement(info, "headline")
    headline_el.text = headline
    
    description = ET.SubElement(info, "description")
    description.text = desc_text
    
    instruction = ET.SubElement(info, "instruction")
    instruction.text = "Take immediate shelter indoors. Avoid open fields, metal structures, and flood-prone drainage basins."
    
    # Polygon and Area
    area = ET.SubElement(info, "area")
    areaDesc = ET.SubElement(area, "areaDesc")
    areaDesc.text = "Coordinate Bounding Box Impact Zone"
    
    # Generate a rough polygon around the lat/lon (10km radius approx)
    lat, lon = coordinates
    polygon = ET.SubElement(area, "polygon")
    polygon.text = f"{lat+0.1},{lon-0.1} {lat+0.1},{lon+0.1} {lat-0.1},{lon+0.1} {lat-0.1},{lon-0.1} {lat+0.1},{lon-0.1}"
    
    # Add Web GIS parameter link
    parameter = ET.SubElement(info, "parameter")
    p_name = ET.SubElement(parameter, "valueName")
    p_name.text = "ConvectNow_Tracker_ID"
    p_val = ET.SubElement(parameter, "value")
    p_val.text = str(cell_id)

    # Prettify XML
    ET.indent(alert, space="  ", level=0)
    xml_str = ET.tostring(alert, encoding="UTF-8", xml_declaration=True).decode("utf-8")
    
    return xml_str
