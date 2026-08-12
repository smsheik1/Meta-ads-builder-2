use std::collections::BTreeMap;
use tvg::layer::{LayerData, ShapeComponentData};
use tvg::read::FileData;

fn describe_info(info: &tvg::layer::ComponentInfo) -> String {
    let raw = &info.raw.0;
    let mut palette_ids = Vec::new();
    for window in raw.windows(8) {
        let id = u64::from_le_bytes(window.try_into().expect("8 byte window"));
        if (id >> 48) == 0x0b6a || (id >> 48) == 0x0b6b || (id >> 48) == 0x0b6c || (id >> 48) == 0x0b70 {
            palette_ids.push(format!("{id:016x}"));
        }
    }
    let regions = if raw.len() >= 11 {
        Some((u32::from_le_bytes(raw[2..6].try_into().unwrap()), u32::from_le_bytes(raw[7..11].try_into().unwrap())))
    } else {
        None
    };
    format!("Info({:?},color={:?},len={},regions={regions:?},palette={palette_ids:?})", info.ty, info.color_id, raw.len())
}

fn summarize_layer(name: &str, layer: &LayerData) {
    let LayerData::Vector(shapes) = layer else { return; };
    let mut kinds = BTreeMap::new();
    for shape in shapes {
        *kinds.entry(format!("{:?}", shape.ty)).or_insert(0usize) += 1;
    }
    println!("layer={name} shapes={} kinds={kinds:?}", shapes.len());
    for (shape_index, shape) in shapes.iter().enumerate() {
        let mut components = Vec::new();
        for component in &shape.components {
            let mut tags = Vec::new();
            for tag in &component.tags {
                match tag {
                    ShapeComponentData::Info(info) => tags.push(describe_info(info)),
                    ShapeComponentData::Path(path) => tags.push(format!("Path({})", path.segments.len())),
                    ShapeComponentData::Thickness(thickness) => tags.push(format!("Thickness(def={},domain={:?})", thickness.definition.as_ref().map_or(0, |points| points.len()), thickness.domain)),
                    ShapeComponentData::Tgti(bytes) => tags.push(format!("Tgti({})", bytes.0.len())),
                }
            }
            components.push(tags.join("+"));
        }
        println!("  shape={shape_index} type={:?} components={}", shape.ty, components.join(" | "));
    }
}

fn main() {
    let path = std::env::args().nth(1).expect("missing TVG path");
    let file = std::fs::File::open(&path).expect("failed to open TVG");
    match tvg::read::read(file) {
        Ok(file) => {
            for item in file {
                if let FileData::Main(items) = item {
                    for item in items {
                        match item {
                            FileData::LayerUnderlay(layer) => summarize_layer("underlay", &layer),
                            FileData::LayerColor(layer) => summarize_layer("color", &layer),
                            FileData::LayerLine(layer) => summarize_layer("line", &layer),
                            FileData::LayerOverlay(layer) => summarize_layer("overlay", &layer),
                            _ => {}
                        }
                    }
                }
            }
        }
        Err(error) => {
            eprintln!("ERROR {path}: {error}");
            std::process::exit(1);
        }
    }
}
