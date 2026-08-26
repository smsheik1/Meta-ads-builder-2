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

#[derive(Default, Serialize)]
struct ArtLayerSpec {
    boundaries: Vec<String>,
    seeds: Vec<PaintSeed>,
    fills: Vec<FillSpec>,
    strokes: Vec<StrokeSpec>,
}

#[derive(Default, Serialize)]
struct ArtLayersSpec {
    underlay: ArtLayerSpec,
    color: ArtLayerSpec,
    line: ArtLayerSpec,
    overlay: ArtLayerSpec,
}

#[derive(Serialize)]
struct DrawingSpec {
    source: String,
    #[serde(flatten)]
    all: ArtLayerSpec,
    art_layers: ArtLayersSpec,
}

struct PaintEntry {
    side: u8,
    x: f32,
    y: f32,
    color: [u8; 4],
    color_id: u64,
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

fn paint_entries(raw: &[u8], palette: &HashMap<u64, [u8; 4]>) -> Vec<PaintEntry> {
    let mut entries = Vec::new();
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
        let block_len = u32::from_le_bytes(raw[tag + 4..tag + 8].try_into().unwrap()) as usize;
        if tag + 8 + block_len > raw.len() || tag + 65 > raw.len() { break; }
        let boundary_x = f32::from_le_bytes(raw[tag + 45..tag + 49].try_into().unwrap()) * GRID_X;
        let boundary_y = -f32::from_le_bytes(raw[tag + 53..tag + 57].try_into().unwrap()) * GRID_Y;
        let color_id = u64::from_le_bytes(raw[tag + 57..tag + 65].try_into().unwrap());
        if let Some(color) = palette.get(&color_id) {
            if boundary_x.is_finite() && boundary_y.is_finite() {
                entries.push(PaintEntry { side, x: boundary_x, y: boundary_y, color: *color, color_id });
            }
        }
        cursor = tag + 8 + block_len;
        side += 1;
    }
    entries
}

#[cfg(test)]
fn paint_seeds(raw: &[u8], boundary_index: usize, palette: &HashMap<u64, [u8; 4]>) -> Vec<PaintSeed> {
    paint_entries(raw, palette).into_iter().map(|entry| PaintSeed {
        boundary_index,
        x: entry.x,
        y: entry.y,
        boundary_x: entry.x,
        boundary_y: entry.y,
        side: entry.side,
        color: entry.color,
        color_id: format!("{:016x}", entry.color_id),
    }).collect()
}

fn path_distance_squared(path: &Path, x: f32, y: f32) -> f32 {
    let mut closest = f32::INFINITY;
    for segment in &path.segments {
        let points: &[(f32, f32)] = match segment {
            PathSegment::Line(point) => std::slice::from_ref(point),
            PathSegment::Cubic(a, b, c) => &[*a, *b, *c],
        };
        for (point_x, point_y) in points {
            let dx = *point_x - x;
            let dy = -*point_y - y;
            closest = closest.min(dx * dx + dy * dy);
        }
    }
    closest
}

fn paint_seed(entry: PaintEntry, boundary_index: usize) -> PaintSeed {
    PaintSeed {
        boundary_index,
        x: entry.x,
        y: entry.y,
        boundary_x: entry.x,
        boundary_y: entry.y,
        side: entry.side,
        color: entry.color,
        color_id: format!("{:016x}", entry.color_id),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_tgco_paint_point_and_palette_id_at_the_correct_offsets() {
        let color_id: u64 = 0x0b6acb7cbef28614;
        let mut raw = vec![0_u8; 126];
        raw[0] = ComponentType::Stroke as u8;
        raw[1] = 1;
        raw[4..8].copy_from_slice(b"TGCO");
        raw[8..12].copy_from_slice(&114_u32.to_le_bytes());
        raw[49..53].copy_from_slice(&(-4.5640564_f32).to_le_bytes());
        raw[57..61].copy_from_slice(&(-3.887169_f32).to_le_bytes());
        raw[61..69].copy_from_slice(&color_id.to_le_bytes());

        let palette = HashMap::from([(color_id, [255, 239, 210, 255])]);
        let seeds = paint_seeds(&raw, 7, &palette);

        assert_eq!(seeds.len(), 1);
        assert_eq!(seeds[0].boundary_index, 7);
        assert!((seeds[0].x - -950.8213).abs() < 0.01);
        assert!((seeds[0].y - 607.3701).abs() < 0.01);
        assert_eq!(seeds[0].color, [255, 239, 210, 255]);
        assert_eq!(seeds[0].color_id, "0b6acb7cbef28614");
    }
}

fn add_color_layer(layer: &LayerData, palette: &HashMap<u64, [u8; 4]>, drawing: &mut ArtLayerSpec) {
    let LayerData::Vector(shapes) = layer else { return; };
    for shape in shapes {
        let mut component_paths = Vec::new();
        let mut component_entries = Vec::new();
        let mut explicit_fills = Vec::new();
        for (component_index, component) in shape.components.iter().enumerate() {
            let mut component_path = None;
            for tag in &component.tags {
                match tag {
                    ShapeComponentData::Info(info) => {
                        component_entries.extend(paint_entries(&info.raw.0, palette).into_iter().map(|entry| (component_index, entry)));
                        if let Some((id, rgba)) = info.color_id.and_then(|id| palette.get(&id).copied().map(|rgba| (id, rgba))) {
                            explicit_fills.push((component_index, id, rgba));
                        }
                    }
                    ShapeComponentData::Path(value) => component_path = Some(value),
                    _ => {}
                }
            }
            if let Some(path) = component_path {
                component_paths.push((component_index, path));
            }
        }
        let first_boundary_index = drawing.boundaries.len();
        for (_, path) in &component_paths {
            let d = path_to_svg(path);
            drawing.boundaries.push(d.clone());
            if shape.ty == ShapeType::Fill {
                if let Some((_, id, color)) = explicit_fills.iter().find(|(component_index, _, _)| {
                    *component_index == component_paths[drawing.boundaries.len() - first_boundary_index - 1].0
                }) {
                    drawing.fills.push(FillSpec { d, color: *color, color_id: format!("{id:016x}") });
                }
            }
        }
        for (component_index, entry) in component_entries {
            let local_boundary_index = component_paths.iter()
                .position(|(candidate, _)| *candidate == component_index)
                .or_else(|| component_paths.iter().enumerate().min_by(|(_, (_, left)), (_, (_, right))| {
                    path_distance_squared(left, entry.x, entry.y)
                        .total_cmp(&path_distance_squared(right, entry.x, entry.y))
                }).map(|(index, _)| index));
            if let Some(local_boundary_index) = local_boundary_index {
                drawing.seeds.push(paint_seed(entry, first_boundary_index + local_boundary_index));
            }
        }
    }
}

fn add_line_layer(layer: &LayerData, palette: &HashMap<u64, [u8; 4]>, drawing: &mut ArtLayerSpec) {
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
                        color = info.color_id
                            .and_then(|id| palette.get(&id).copied().map(|rgba| (id, rgba)))
                            .or_else(|| paint_entries(&info.raw.0, palette)
                                .into_iter()
                                .next()
                                .map(|entry| (entry.color_id, entry.color)));
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
        all: ArtLayerSpec::default(),
        art_layers: ArtLayersSpec::default(),
    };
    for item in main {
        match item {
            FileData::LayerUnderlay(layer) => {
                add_color_layer(layer, &palette, &mut drawing.all);
                add_color_layer(layer, &palette, &mut drawing.art_layers.underlay);
            }
            FileData::LayerColor(layer) => {
                add_color_layer(layer, &palette, &mut drawing.all);
                add_color_layer(layer, &palette, &mut drawing.art_layers.color);
            }
            FileData::LayerLine(layer) => {
                add_line_layer(layer, &palette, &mut drawing.all);
                add_line_layer(layer, &palette, &mut drawing.art_layers.line);
            }
            FileData::LayerOverlay(layer) => {
                add_line_layer(layer, &palette, &mut drawing.all);
                add_line_layer(layer, &palette, &mut drawing.art_layers.overlay);
            }
            _ => {}
        }
    }
    println!("{}", serde_json::to_string(&drawing).unwrap());
}
