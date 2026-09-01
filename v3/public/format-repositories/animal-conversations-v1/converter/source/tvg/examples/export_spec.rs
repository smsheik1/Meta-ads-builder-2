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

fn points_match(left: (f32, f32), right: (f32, f32)) -> bool {
    const EPSILON: f32 = 0.001;
    (left.0 - right.0).abs() <= EPSILON && (left.1 - right.1).abs() <= EPSILON
}

fn path_start(path: &Path) -> Option<(f32, f32)> {
    match path.segments.first()? {
        PathSegment::Line(point) => Some(*point),
        PathSegment::Cubic(_, _, _) => {
            panic!("TVG path must begin with a line point before any cubic segment")
        }
    }
}

fn path_end(path: &Path) -> Option<(f32, f32)> {
    match path.segments.last()? {
        PathSegment::Line(point) => Some(*point),
        PathSegment::Cubic(_, _, point) => Some(*point),
    }
}

#[derive(Clone, Copy)]
struct OrientedPath<'a> {
    path: &'a Path,
    reversed: bool,
}

fn oriented_start(path: OrientedPath<'_>) -> Option<(f32, f32)> {
    if path.reversed {
        path_end(path.path)
    } else {
        path_start(path.path)
    }
}

fn oriented_end(path: OrientedPath<'_>) -> Option<(f32, f32)> {
    if path.reversed {
        path_start(path.path)
    } else {
        path_end(path.path)
    }
}

fn matching_path(
    paths: &[&Path],
    used: &[bool],
    endpoint: (f32, f32),
    match_start: bool,
) -> Option<(usize, bool)> {
    let mut matches = Vec::new();
    for (index, path) in paths.iter().enumerate() {
        if used[index] {
            continue;
        }
        let start = path_start(path);
        let end = path_end(path);
        let normal_match = if match_start {
            end.is_some_and(|candidate| points_match(candidate, endpoint))
        } else {
            start.is_some_and(|candidate| points_match(candidate, endpoint))
        };
        let reversed_match = if match_start {
            start.is_some_and(|candidate| points_match(candidate, endpoint))
        } else {
            end.is_some_and(|candidate| points_match(candidate, endpoint))
        };
        if normal_match {
            matches.push((index, false));
        }
        if reversed_match && !normal_match {
            matches.push((index, true));
        }
    }
    match matches.as_slice() {
        [] => None,
        [only] => Some(*only),
        _ => panic!("TVG compound fill has ambiguous path topology at {endpoint:?}"),
    }
}

fn stitch_paths<'a>(paths: Vec<&'a Path>, require_closed: bool) -> Vec<Vec<OrientedPath<'a>>> {
    let mut used = vec![false; paths.len()];
    let mut chains = Vec::new();
    while let Some(seed_index) = used.iter().position(|used| !*used) {
        used[seed_index] = true;
        let mut chain = vec![OrientedPath {
            path: paths[seed_index],
            reversed: false,
        }];
        loop {
            let start = oriented_start(chain[0]);
            let end = oriented_end(*chain.last().expect("path chain must not be empty"));
            if start.zip(end).is_some_and(|(start, end)| points_match(start, end)) {
                break;
            }
            if let Some(end) = end {
                if let Some((index, reversed)) = matching_path(&paths, &used, end, false) {
                    used[index] = true;
                    chain.push(OrientedPath { path: paths[index], reversed });
                    continue;
                }
            }
            if let Some(start) = start {
                if let Some((index, reversed)) = matching_path(&paths, &used, start, true) {
                    used[index] = true;
                    chain.insert(0, OrientedPath { path: paths[index], reversed });
                    continue;
                }
            }
            break;
        }
        if require_closed {
            let start = oriented_start(chain[0]);
            let end = oriented_end(*chain.last().expect("path chain must not be empty"));
            if !start
                .zip(end)
                .is_some_and(|(start, end)| points_match(start, end))
            {
                panic!("TVG fill has an open path contour");
            }
        }
        chains.push(chain);
    }
    chains
}

fn push_point(out: &mut String, command: char, (x, y): (f32, f32)) {
    out.push(command);
    out.push_str(&format!("{x} {}", -y));
}

fn push_oriented_path(out: &mut String, path: OrientedPath<'_>, continues_previous: bool) {
    if !out.is_empty() {
        out.push(' ');
    }
    if !path.reversed {
        for (segment_index, segment) in path.path.segments.iter().enumerate() {
            match segment {
                PathSegment::Line(point) => {
                    push_point(out, if segment_index == 0 && !continues_previous { 'M' } else { 'L' }, *point);
                }
                PathSegment::Cubic((a, b), (c, d), (e, f)) => {
                    out.push_str(&format!("C{a} {} {c} {} {e} {}", -b, -d, -f));
                }
            }
        }
        return;
    }

    let Some(start) = path_end(path.path) else { return; };
    push_point(out, if continues_previous { 'L' } else { 'M' }, start);
    for segment_index in (1..path.path.segments.len()).rev() {
        let previous = match &path.path.segments[segment_index - 1] {
            PathSegment::Line(point) => *point,
            PathSegment::Cubic(_, _, point) => *point,
        };
        match &path.path.segments[segment_index] {
            PathSegment::Line(_) => push_point(out, 'L', previous),
            PathSegment::Cubic((a, b), (c, d), _) => {
                out.push_str(&format!("C{c} {} {a} {} {} {}", -d, -b, previous.0, -previous.1));
            }
        }
    }
}

fn paths_to_svg<'a>(
    paths: impl IntoIterator<Item = &'a Path>,
    require_closed: bool,
) -> String {
    let mut out = String::new();
    for chain in stitch_paths(paths.into_iter().collect(), require_closed) {
        for (index, path) in chain.into_iter().enumerate() {
            push_oriented_path(&mut out, path, index > 0);
        }
    }
    out
}

fn path_to_svg(path: &Path) -> String {
    paths_to_svg(std::iter::once(path), false)
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
    use tvg::layer::{ComponentInfo, ShapeComponent, VectorShape};
    use tvg::util::Bytes;

    fn component(
        ty: ComponentType,
        color_id: Option<u64>,
        raw: Vec<u8>,
        segments: Vec<PathSegment>,
    ) -> ShapeComponent {
        ShapeComponent {
            tags: vec![
                ShapeComponentData::Info(ComponentInfo {
                    ty,
                    color_id,
                    raw: Bytes(raw),
                }),
                ShapeComponentData::Path(Path { segments }),
            ],
        }
    }

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

    #[test]
    fn line_layer_preserves_every_component_of_one_harmony_fill_shape() {
        let color_id: u64 = 0x0102030405060708;
        let mut paint_raw = vec![0_u8; 85];
        paint_raw[0] = ComponentType::Fill as u8;
        paint_raw[1] = 0;
        paint_raw[6] = 1;
        paint_raw[9..13].copy_from_slice(b"TGCO");
        paint_raw[13..17].copy_from_slice(&66_u32.to_le_bytes());
        paint_raw[54..58].copy_from_slice(&0.0_f32.to_le_bytes());
        paint_raw[62..66].copy_from_slice(&0.0_f32.to_le_bytes());
        paint_raw[66..74].copy_from_slice(&color_id.to_le_bytes());
        let layer = LayerData::Vector(vec![VectorShape {
            // Harmony stores the pupil fill as an Unknown5 shape whose
            // individual components are all tagged as fills. Only the first
            // component carries the paint record.
            ty: ShapeType::Unknown5,
            components: vec![
                component(
                    ComponentType::Fill,
                    None,
                    paint_raw,
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 0.0)),
                        PathSegment::Line((10.0, 10.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 10.0)),
                        PathSegment::Line((0.0, 0.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([(color_id, [77, 17, 3, 255])]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);

        assert_eq!(drawing.boundaries.len(), 1);
        assert_eq!(drawing.fills.len(), 1);
        assert_eq!(drawing.fills[0].d, drawing.boundaries[0]);
        assert_eq!(drawing.fills[0].d.matches('M').count(), 1);
        assert!(drawing.fills[0].d.contains("L10 -10"));
        assert_eq!(drawing.fills[0].color, [77, 17, 3, 255]);
        assert_eq!(drawing.fills[0].color_id, "0102030405060708");
    }

    #[test]
    fn compound_fill_stitches_out_of_order_components() {
        let color_id = 0x090a0b0c0d0e0f10;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Unknown5,
            components: vec![
                component(
                    ComponentType::Fill,
                    Some(color_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 10.0)),
                        PathSegment::Line((0.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 0.0)),
                        PathSegment::Line((10.0, 10.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([(color_id, [77, 17, 3, 255])]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);

        assert_eq!(drawing.boundaries.len(), 1);
        assert_eq!(drawing.fills.len(), 1);
        assert_eq!(drawing.fills[0].d.matches('M').count(), 1);
        assert_eq!(drawing.fills[0].d.matches('L').count(), 5);
        assert!(drawing.fills[0].d.ends_with("L0 -0"));
    }

    #[test]
    fn compound_fill_reverses_cubic_controls_when_stitching() {
        let color_id = 0x1112131415161718;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Unknown5,
            components: vec![
                component(
                    ComponentType::Fill,
                    Some(color_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 10.0)),
                        PathSegment::Cubic((12.0, 8.0), (12.0, 2.0), (10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 10.0)),
                        PathSegment::Line((0.0, 0.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([(color_id, [90, 80, 70, 255])]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);

        assert_eq!(drawing.fills[0].d.matches('M').count(), 1);
        assert!(drawing.fills[0].d.contains("C12 -2 12 -8 10 -10"));
        assert!(drawing.fills[0].d.ends_with("L0 -0"));
    }

    #[test]
    fn compound_fill_keeps_closed_tangent_contours_separate() {
        let color_id = 0x1112131415161718;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Fill,
            components: vec![
                component(
                    ComponentType::Fill,
                    Some(color_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((20.0, 0.0)),
                        PathSegment::Line((20.0, 20.0)),
                        PathSegment::Line((0.0, 20.0)),
                        PathSegment::Line((0.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Unknown1,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((8.0, 4.0)),
                        PathSegment::Line((4.0, 8.0)),
                        PathSegment::Line((0.0, 0.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([(color_id, [90, 80, 70, 255])]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);

        assert_eq!(drawing.boundaries.len(), 1);
        assert_eq!(drawing.fills.len(), 1);
        assert_eq!(drawing.fills[0].d.matches('M').count(), 2);
    }

    #[test]
    #[should_panic(expected = "open path contour")]
    fn compound_fill_rejects_an_open_contour() {
        let color_id = 0x191a1b1c1d1e1f20;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Unknown5,
            components: vec![
                component(
                    ComponentType::Fill,
                    Some(color_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 0.0)),
                        PathSegment::Line((10.0, 10.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([(color_id, [90, 80, 70, 255])]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);
    }

    #[test]
    #[should_panic(expected = "open path contour")]
    fn fill_rejects_a_single_open_contour() {
        let color_id = 0x292a2b2c2d2e2f30;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Unknown5,
            components: vec![component(
                ComponentType::Fill,
                Some(color_id),
                Vec::new(),
                vec![
                    PathSegment::Line((0.0, 0.0)),
                    PathSegment::Line((10.0, 0.0)),
                ],
            )],
        }]);
        let palette = HashMap::from([(color_id, [90, 80, 70, 255])]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);
    }

    #[test]
    fn svg_path_keeps_an_open_stroke_permissive() {
        let path = Path {
            segments: vec![
                PathSegment::Line((0.0, 0.0)),
                PathSegment::Line((10.0, 0.0)),
            ],
        };

        assert_eq!(path_to_svg(&path), "M0 -0L10 -0");
    }

    #[test]
    #[should_panic(expected = "ambiguous path topology")]
    fn compound_fill_rejects_an_ambiguous_branch() {
        let color_id = 0x2122232425262728;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Unknown5,
            components: vec![
                component(
                    ComponentType::Fill,
                    Some(color_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 0.0)),
                        PathSegment::Line((10.0, 10.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    None,
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 0.0)),
                        PathSegment::Line((20.0, 0.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([(color_id, [90, 80, 70, 255])]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);
    }

    #[test]
    #[should_panic(expected = "conflicting compound-fill colors")]
    fn compound_fill_rejects_conflicting_component_colors() {
        let first_id = 0x2122232425262728;
        let second_id = 0x3132333435363738;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Unknown5,
            components: vec![
                component(
                    ComponentType::Fill,
                    Some(first_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Fill,
                    Some(second_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 0.0)),
                        PathSegment::Line((0.0, 0.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([
            (first_id, [1, 2, 3, 255]),
            (second_id, [4, 5, 6, 255]),
        ]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);
    }

    #[test]
    #[should_panic(expected = "mixes fill geometry with stroke or pencil components")]
    fn compound_fill_rejects_mixed_pencil_components() {
        let fill_id = 0x4142434445464748;
        let pencil_id = 0x5152535455565758;
        let layer = LayerData::Vector(vec![VectorShape {
            ty: ShapeType::Fill,
            components: vec![
                component(
                    ComponentType::Fill,
                    Some(fill_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((0.0, 0.0)),
                        PathSegment::Line((10.0, 0.0)),
                    ],
                ),
                component(
                    ComponentType::Pencil,
                    Some(pencil_id),
                    Vec::new(),
                    vec![
                        PathSegment::Line((10.0, 0.0)),
                        PathSegment::Line((0.0, 0.0)),
                    ],
                ),
            ],
        }]);
        let palette = HashMap::from([
            (fill_id, [1, 2, 3, 255]),
            (pencil_id, [4, 5, 6, 255]),
        ]);
        let mut drawing = ArtLayerSpec::default();

        add_line_layer(&layer, &palette, &mut drawing);
    }

    #[test]
    #[should_panic(expected = "TVG path must begin with a line point")]
    fn svg_path_rejects_a_cubic_segment_without_a_move_point() {
        let path = Path {
            segments: vec![PathSegment::Cubic(
                (0.0, 0.0),
                (1.0, 1.0),
                (2.0, 2.0),
            )],
        };

        path_to_svg(&path);
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
    for (shape_index, shape) in shapes.iter().enumerate() {
        let component_info_types = shape
            .components
            .iter()
            .flat_map(|component| {
                component.tags.iter().filter_map(|tag| match tag {
                    ShapeComponentData::Info(info) => Some(info.ty),
                    _ => None,
                })
            })
            .collect::<Vec<_>>();
        let has_stroke_or_pencil_component = component_info_types
            .iter()
            .any(|ty| matches!(*ty, ComponentType::Stroke | ComponentType::Pencil));
        if shape.ty == ShapeType::Fill && has_stroke_or_pencil_component {
            panic!(
                "TVG line shape {shape_index} mixes fill geometry with stroke or pencil components"
            );
        }
        let all_components_are_fills = !component_info_types.is_empty()
            && component_info_types.iter().all(|ty| *ty == ComponentType::Fill);
        if shape.ty == ShapeType::Fill || all_components_are_fills {
            let mut paths = Vec::new();
            let mut shape_color = None;
            for component in &shape.components {
                for tag in &component.tags {
                    match tag {
                        ShapeComponentData::Info(info) => {
                            if info.ty != ComponentType::Fill {
                                continue;
                            }
                            let direct_color = info.color_id.and_then(|id| {
                                palette.get(&id).copied().map(|rgba| (id, rgba))
                            });
                            let resolved_colors = if let Some(direct_color) = direct_color {
                                vec![direct_color]
                            } else {
                                paint_entries(&info.raw.0, palette)
                                    .into_iter()
                                    .map(|entry| (entry.color_id, entry.color))
                                    .collect::<Vec<_>>()
                            };
                            for candidate in resolved_colors {
                                match shape_color {
                                    None => shape_color = Some(candidate),
                                    Some(current) if current == candidate => {}
                                    Some((current_id, _)) => panic!(
                                        "TVG line shape {shape_index} has conflicting compound-fill colors {current_id:016x} and {:016x}",
                                        candidate.0
                                    ),
                                }
                            }
                        }
                        ShapeComponentData::Path(path) => paths.push(path),
                        _ => {}
                    }
                }
            }
            if !paths.is_empty() {
                let d = paths_to_svg(paths, true);
                drawing.boundaries.push(d.clone());
                if let Some((id, color)) = shape_color {
                    drawing.fills.push(FillSpec {
                        d,
                        color,
                        color_id: format!("{id:016x}"),
                    });
                }
            }
            continue;
        }
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
