#!/usr/bin/env python3
import json
import sys
import xml.etree.ElementTree as ET


def column_value(column, frame=1):
    path_point = column.find(f".//path3D/points/pt[@lockedInTime='{frame}']")
    if path_point is not None:
        return [float(value) for value in path_point.attrib["val"].split(",")]
    for point in column.findall(".//points/pt"):
        frames = [int(value) for value in point.attrib.get("x", "").split(",") if value]
        if frame in frames:
            return float(point.attrib["y"])
    return None


def attribute_value(node, columns, frame=1):
    column_name = node.attrib.get("col")
    if column_name and column_name in columns:
        value = column_value(columns[column_name], frame)
        if value is not None:
            return value
    return float(node.attrib.get("val", node.attrib.get("defaultValue", "0")))


def main():
    source = sys.argv[1]
    wanted = set(sys.argv[2:])
    root = ET.parse(source).getroot()
    columns = {column.attrib["name"]: column for column in root.findall(".//column") if "name" in column.attrib}
    output = []
    for module in root.findall(".//module[@type='PEG']"):
        name = module.attrib.get("name", "")
        if wanted and name not in wanted:
            continue
        attrs = module.find("attrs")
        if attrs is None:
            continue
        position_node = attrs.find("position/attr3dpath")
        position = attribute_value(position_node, columns) if position_node is not None else [0, 0, 0]
        if not isinstance(position, list):
            position = [0, 0, 0]
        output.append({
            "name": name,
            "position": position,
            "scale": [
                attribute_value(attrs.find("scale/x"), columns),
                attribute_value(attrs.find("scale/y"), columns),
            ],
            "rotation": attribute_value(attrs.find("rotation/anglez"), columns),
            "skew": attribute_value(attrs.find("skew"), columns),
            "pivot": [
                attribute_value(attrs.find("pivot/x"), columns),
                attribute_value(attrs.find("pivot/y"), columns),
            ],
        })
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
