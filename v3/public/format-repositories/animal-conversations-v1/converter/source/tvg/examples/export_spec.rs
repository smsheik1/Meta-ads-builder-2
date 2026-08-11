use serde::Serialize;
use std::collections::HashMap;
use tvg::layer::{ComponentType, LayerData, Path, PathSegment, ShapeComponentData, ShapeType};
use tvg::palette::ColorData;
use tvg::read::FileData;

const GRID_X: f32 = 208.328125;
const GRID_Y: f32 = 156.25;

#[derive(Serialize)]
struct PaintSeed {
    boundary_index: usize,
    x: f32,
    y: f32,
    boundary_x: f32,
    boundary_y: f32,
    side: u8,
    color: [u8; 4],
    color_id: String,
}

#[derive(Serialize)]
struct StrokeSpec {
    d: String,
    color: [u8; 4],
    color_id: String,
    width: f32,
}

#[derive(Serialize)]
struct FillSpec {
    d: String,
    color: [u8; 4],
    color_id: String,
}

#[derive(Serialize)]
struct DrawingSpec {
    source: String,
    boundaries: Vec<String>,
    seeds: Vec<PaintSeed>,
    fills: Vec<FillSpec>,
    strokes: Vec<StrokeSpec>,
}

fn path_to_svg(path: &Path) -> String {
    let mut out = String::new();
    for segment in &path.segments {
        match segment {
            PathSegment::Line((x, y)) => {
                if out.is_empty() {
                    out.push_str(&format!("M{x} {}", -y));
                } else {
                    out.push_str(&format!(" L{x} {}", -y));
                }
            }
            PathSegment::Cubic((a, b), (c, d), (e, f)) => {
                out.push_str(&format!(" C{a} {} {c} {} {e} {}", -b, -d, -f));
            }
        }
    }
    out
}

fn palette_map(items: &[FileData]) -> HashMap<u64, [u8; 4]> {
    let mut map = HashMap::new();
    for item in items {
        let FileData::Palette(palette) = item else { continue; };
        for color in &palette.colors {
            let mut id = None;
            let mut rgba = None;
            for tag in &color.tags {
                match tag {
                    ColorData::ColorId { id: value, .. } => id = Some(*value),
                    ColorData::ColorRgba(r, g, b, a) => rgba = Some([*r, *g, *b, *a]),
                }
            }
            if let (Some(id), Some(rgba)) = (id, rgba) {
                map.insert(id, rgba);
            }
        }
    }
    map
}

fn paint_seeds(raw: &[u8], boundary_index: usize, palette: &HashMap<u64, [u8; 4]>) -> Vec<PaintSeed> {
    let mut seeds = Vec::new();
    let mut cursor = 1usize;
    let mut side = 0u8;
    while side < 2 && cursor < raw.len().saturating_sub(2) {
        if raw[cursor] == 0 {
            cursor += 5;
            side += 1;
            continue;
        }
        if raw[cursor] != 1 || cursor + 68 > raw.len() { break; }
        let tag = cursor + 3;
        if &raw[tag..tag + 4] != b"TGCO" { break; }
        let boundary_x = f32::from_le_bytes(raw[tag + 45..tag + 49].try_into().unwrap()) * GRID_X;
        let boundary_y = -f32::from_le_bytes(raw[tag + 53..tag + 57].try_into().unwrap()) * GRID_Y;
        let color_id = u64::from_le_bytes(raw[tag + 57..tag + 65].try_into().unwrap());
        if let Some(color) = palette.get(&color_id) {
            if boundary_x.is_finite() && boundary_y.is_finite() {
                let x = boundary_x;
                let y = boundary_y;
                seeds.push(PaintSeed { boundary_index, x, y, boundary_x, boundary_y, side, color: *color, color_id: format!("{color_id:016x}") });
            }
        }
        cursor = tag + 122;
        side += 1;
    }
    seeds
}

fn add_color_layer(layer: &LayerData, palette: &HashMap<u64, [u8; 4]>, drawing: &mut DrawingSpec) {
    let LayerData::Vector(shapes) = layer else { return; };
    for shape in shapes {
        for component in &shape.components {
            let mut explicit_color = None;
            let mut info_raw = Vec::new();
            let mut path = None;
            for tag in &component.tags {
                match tag {
                    ShapeComponentData::Info(info) => {
                        info_raw.push(info.raw.0.as_slice());
                        explicit_color = info.color_id.and_then(|id| palette.get(&id).copied().map(|rgba| (id, rgba)));
                    }
                    ShapeComponentData::Path(value) => path = Some(value),
                    _ => {}
                }
            }
            let Some(path) = path else { continue; };
            let d = path_to_svg(path);
            let boundary_index = drawing.boundaries.len();
            for raw in info_raw {
                drawing.seeds.extend(paint_seeds(raw, boundary_index, palette));
            }
            drawing.boundaries.push(d.clone());
            if shape.ty == ShapeType::Fill {
                if let Some((id, color)) = explicit_color {
                    drawing.fills.push(FillSpec { d, color, color_id: format!("{id:016x}") });
                }
            }
        }
    }
}

fn add_line_layer(layer: &LayerData, palette: &HashMap<u64, [u8; 4]>, drawing: &mut DrawingSpec) {
    let LayerData::Vector(shapes) = layer else { return; };
    for shape in shapes {
        let mut thickness = None;
        for component in &shape.components {
            let mut color = None;
            let mut component_type = None;
            let mut path = None;
            for tag in &component.tags {
                match tag {
                    ShapeComponentData::Info(info) => {
                        component_type = Some(info.ty);
                        color = info.color_id.and_then(|id| palette.get(&id).copied().map(|rgba| (id, rgba)));
                    }
                    ShapeComponentData::Path(value) => path = Some(value),
                    ShapeComponentData::Thickness(value) => {
                        if let Some(points) = &value.definition {
                            if !points.is_empty() {
                                let sum: f32 = points.iter().map(|point| point.left.offset.abs() + point.right.offset.abs()).sum();
                                thickness = Some((sum / points.len() as f32).max(1.0));
                            }
                        }
                    }
                    _ => {}
                }
            }
            let (Some(path), Some((id, rgba))) = (path, color) else { continue; };
            let d = path_to_svg(path);
            drawing.boundaries.push(d.clone());
            if shape.ty == ShapeType::Fill || component_type == Some(ComponentType::Fill) {
                drawing.fills.push(FillSpec { d, color: rgba, color_id: format!("{id:016x}") });
            } else {
                drawing.strokes.push(StrokeSpec {
                    d,
                    color: rgba,
                    color_id: format!("{id:016x}"),
                    width: thickness.unwrap_or(18.0),
                });
            }
        }
    }
}

fn main() {
    let source = std::env::args().nth(1).expect("missing TVG path");
    let file = std::fs::File::open(&source).expect("failed to open TVG");
    let decoded = tvg::read::read(file).expect("failed to decode TVG");
    let main = decoded.iter().find_map(|item| match item {
        FileData::Main(items) => Some(items.as_slice()),
        _ => None,
    }).expect("TVG has no main data");
    let palette = palette_map(main);
    let mut drawing = DrawingSpec {
        source,
        boundaries: Vec::new(),
        seeds: Vec::new(),
        fills: Vec::new(),
        strokes: Vec::new(),
    };
    for item in main {
        match item {
            FileData::LayerUnderlay(layer) | FileData::LayerColor(layer) => add_color_layer(layer, &palette, &mut drawing),
            FileData::LayerLine(layer) | FileData::LayerOverlay(layer) => add_line_layer(layer, &palette, &mut drawing),
            _ => {}
        }
    }
    println!("{}", serde_json::to_string(&drawing).unwrap());
}
