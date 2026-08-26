#!/usr/bin/env python3
"""Export an Xstage scene as a deterministic, renderer-facing manifest.

The existing scene summaries intentionally expose only a small diagnostic
subset.  A runtime needs the complete node graph, animated attribute column
references, drawing exposures, and unsupported module payloads intact.  This
exporter keeps those records without depending on Harmony.
"""

from __future__ import annotations

import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "harmony-xstage-runtime-v1"


def xml_value(element: ET.Element) -> dict[str, Any]:
    """Preserve arbitrary XML payloads while keeping duplicate tags ordered."""

    value: dict[str, Any] = {}
    if element.attrib:
        value["attributes"] = dict(sorted(element.attrib.items()))
    text = (element.text or "").strip()
    if text:
        value["text"] = text

    children: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for child in element:
        children[child.tag].append(xml_value(child))
    if children:
        value["children"] = {
            tag: records for tag, records in sorted(children.items())
        }
    return value


def parse_frame_expression(expression: str) -> list[int]:
    frames: list[int] = []
    for part in expression.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start_text, end_text = part.split("-", 1)
            start = int(start_text)
            end = int(end_text)
            if end < start:
                raise ValueError(f"descending frame range: {part}")
            frames.extend(range(start, end + 1))
        else:
            frames.append(int(part))
    return frames


def project_options(root: ET.Element) -> dict[str, Any]:
    options: dict[str, Any] = {}
    for option in root.findall("./options/*"):
        options[option.tag] = xml_value(option)
    return options


def project_stage(root: ET.Element) -> dict[str, Any]:
    """Keep the camera/model-unit conversion needed by an external renderer."""

    resolution = root.find("./options/resolution")
    if resolution is None:
        resolution = root.find("./resolution")
    vector_scale = root.find("./options/pixelPerModelUnitForVectorLayers")
    if vector_scale is None:
        vector_scale = root.find("./pixelPerModelUnitForVectorLayers")
    bitmap_scale = root.find("./options/pixelPerModelUnitForBitmapLayers")
    if bitmap_scale is None:
        bitmap_scale = root.find("./pixelPerModelUnitForBitmapLayers")
    metrics = root.find("./options/metrics")
    size = []
    if resolution is not None:
        size = [
            int(component)
            for component in resolution.attrib.get("size", "").split(",")
            if component
        ]
    return {
        "resolution": {
            "name": resolution.attrib.get("name", "") if resolution is not None else "",
            "size": size,
            "fovFit": resolution.attrib.get("fovFit", "") if resolution is not None else "",
            "fov": float(resolution.attrib.get("fov", "0")) if resolution is not None else 0,
            "projection": resolution.attrib.get("projection", "") if resolution is not None else "",
        },
        "pixelPerModelUnitForVectorLayers": float(vector_scale.attrib.get("val", "0"))
        if vector_scale is not None
        else 0,
        "pixelPerModelUnitForBitmapLayers": float(bitmap_scale.attrib.get("val", "0"))
        if bitmap_scale is not None
        else 0,
        "metrics": {
            "unitAspectRatioX": float(metrics.attrib.get("unitAspectRatioX", "1"))
            if metrics is not None
            else 1,
            "unitAspectRatioY": float(metrics.attrib.get("unitAspectRatioY", "1"))
            if metrics is not None
            else 1,
            "numberOfUnitsX": float(metrics.attrib.get("numberOfUnitsX", "0"))
            if metrics is not None
            else 0,
            "numberOfUnitsY": float(metrics.attrib.get("numberOfUnitsY", "0"))
            if metrics is not None
            else 0,
        },
    }


def elements(root: ET.Element) -> list[dict[str, Any]]:
    output = []
    for element in root.findall("./elements/element"):
        output.append(
            {
                "id": int(element.attrib["id"]),
                "name": element.attrib.get("elementName", ""),
                "folder": element.attrib.get("elementFolder", ""),
                "rootFolder": element.attrib.get("rootFolder", ""),
                "fieldChart": int(element.attrib.get("fieldChart", "12")),
                "vectorType": int(element.attrib.get("vectorType", "0")),
                "drawings": [
                    drawing.attrib.get("name", "")
                    for drawing in list(element.findall("./drawings/drawing"))
                    + list(element.findall("./drawings/dwg"))
                ],
            }
        )
    return sorted(output, key=lambda record: record["id"])


def column_record(column: ET.Element) -> dict[str, Any]:
    column_type = int(column.attrib.get("type", "-1"))
    record: dict[str, Any] = {
        "name": column.attrib["name"],
        "type": column_type,
        "displayOrder": int(column.attrib.get("displayOrder", "0")),
        "anonymous": column.attrib.get("anonymous", "false") == "true",
        "payload": xml_value(column),
    }
    if "id" in column.attrib:
        record["elementId"] = int(column.attrib["id"])

    if column_type == 0:
        exposures = []
        for sequence in column.findall("./elementSeq"):
            exposures.append(
                {
                    "expression": sequence.attrib["exposures"],
                    "frames": parse_frame_expression(sequence.attrib["exposures"]),
                    "drawing": sequence.attrib.get("val", ""),
                    "drawingId": int(sequence.attrib.get("id", "0")),
                }
            )
        record["exposures"] = exposures
        record["heldFrames"] = sorted(
            {
                frame
                for held in column.findall("./heldSeq")
                for frame in parse_frame_expression(held.attrib.get("exposures", ""))
            }
        )
    elif column_type == 2:
        path = column.find("./path3D")
        record["path3d"] = {
            "attributes": dict(sorted(path.attrib.items())) if path is not None else {},
            "points": [
                {
                    "frame": int(point.attrib["lockedInTime"]),
                    "value": [float(value) for value in point.attrib["val"].split(",")],
                }
                for point in ([] if path is None else path.findall("./points/pt"))
                if "lockedInTime" in point.attrib and "val" in point.attrib
            ],
        }
    elif column_type == 3:
        points = column.find("./points")
        record["points"] = [
            {
                "expression": point.attrib.get("x", ""),
                "frames": parse_frame_expression(point.attrib.get("x", "")),
                "value": float(point.attrib.get("y", "0")),
                "localValue": float(point.attrib.get("yLocal", point.attrib.get("y", "0"))),
                "constantSegment": point.attrib.get("constSeg", "false") == "true",
            }
            for point in ([] if points is None else points.findall("./pt"))
        ]
    return record


def canonical_endpoint(group_path: str, endpoint: str) -> str:
    if not group_path:
        return endpoint
    if endpoint.startswith(f"{group_path}/"):
        return endpoint
    return f"{group_path}/{endpoint}"


def walk_group(
    group: ET.Element,
    parent_path: str,
    nodes: list[dict[str, Any]],
    links: list[dict[str, Any]],
    groups: list[dict[str, Any]],
) -> None:
    name = group.attrib.get("name", "")
    group_path = "/".join(part for part in (parent_path, name) if part)
    groups.append(
        {
            "path": group_path,
            "name": name,
            "position": group.attrib.get("pos"),
            "options": xml_value(group.find("./options"))
            if group.find("./options") is not None
            else {},
        }
    )

    nodeslist = group.find("./nodeslist")
    if nodeslist is not None:
        for item in nodeslist:
            if item.tag == "group":
                walk_group(item, group_path, nodes, links, groups)
                continue
            if item.tag != "module":
                continue
            node_name = item.attrib.get("name", "")
            attrs = item.find("./attrs")
            options = item.find("./options")
            nodes.append(
                {
                    "path": canonical_endpoint(group_path, node_name),
                    "groupPath": group_path,
                    "name": node_name,
                    "type": item.attrib.get("type", ""),
                    "position": item.attrib.get("pos", ""),
                    "publishUnderTab": item.attrib.get("publishUnderTab"),
                    "options": xml_value(options) if options is not None else {},
                    "attrs": xml_value(attrs) if attrs is not None else {},
                    "ports": [xml_value(port) for port in item.findall("./ports/port")],
                    "overrideColors": [
                        xml_value(color) for color in item.findall("./overrideColors/color")
                    ],
                }
            )

    linkedlist = group.find("./linkedlist")
    if linkedlist is not None:
        for link in linkedlist.findall("./link"):
            links.append(
                {
                    "groupPath": group_path,
                    "from": canonical_endpoint(group_path, link.attrib["out"]),
                    "to": canonical_endpoint(group_path, link.attrib["in"]),
                    "fromPort": int(link.attrib["outport"])
                    if "outport" in link.attrib
                    else None,
                    "toPort": int(link.attrib["inport"])
                    if "inport" in link.attrib
                    else None,
                }
            )


def scene_record(scene: ET.Element) -> dict[str, Any]:
    rootgroup = scene.find("./rootgroup")
    if rootgroup is None:
        raise ValueError("scene has no rootgroup")
    nodes: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []
    groups: list[dict[str, Any]] = []
    walk_group(rootgroup, "", nodes, links, groups)
    return {
        "id": scene.attrib.get("id", ""),
        "name": scene.attrib.get("name", ""),
        "frameCount": int(scene.attrib.get("nbframes", "0")),
        "startFrame": int(scene.attrib.get("startFrame", "1")),
        "stopFrame": int(scene.attrib.get("stopFrame", "0")),
        "columns": [
            column_record(column)
            for column in scene.findall("./columns/column")
        ],
        "groups": sorted(groups, key=lambda record: record["path"]),
        "nodes": sorted(nodes, key=lambda record: record["path"]),
        "links": sorted(
            links,
            key=lambda record: (
                record["groupPath"],
                record["from"],
                record["to"],
                -1 if record["fromPort"] is None else record["fromPort"],
                -1 if record["toPort"] is None else record["toPort"],
            ),
        ),
    }


def build_manifest(source: Path) -> dict[str, Any]:
    source_bytes = source.read_bytes()
    root = ET.fromstring(source_bytes)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "source": {
            "file": source.name,
            "sha256": hashlib.sha256(source_bytes).hexdigest(),
            "creator": root.attrib.get("creator", ""),
            "software": root.attrib.get("source", ""),
            "version": root.attrib.get("version", ""),
            "build": root.attrib.get("build", ""),
        },
        "options": project_options(root),
        "stage": project_stage(root),
        "elements": elements(root),
        "scenes": [scene_record(scene) for scene in root.findall("./scenes/scene")],
    }


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: scene_runtime_manifest.py /absolute/scene.xstage")
    manifest = build_manifest(Path(sys.argv[1]))
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
