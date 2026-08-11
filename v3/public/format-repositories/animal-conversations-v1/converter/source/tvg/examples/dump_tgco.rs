use tvg::layer::{LayerData, ShapeComponentData};
use tvg::read::FileData;

fn dump(layer: &LayerData) {
    let LayerData::Vector(shapes) = layer else { return; };
    for (shape_index, shape) in shapes.iter().enumerate() {
        for (component_index, component) in shape.components.iter().enumerate() {
            let mut points = Vec::new();
            for tag in &component.tags {
                if let ShapeComponentData::Path(path) = tag {
                    for segment in &path.segments {
                        match segment {
                            tvg::layer::PathSegment::Line(point) => points.push(*point),
                            tvg::layer::PathSegment::Cubic(a, b, c) => points.extend([*a, *b, *c]),
                        }
                    }
                }
            }
            for tag in &component.tags {
                let ShapeComponentData::Info(info) = tag else { continue; };
                if info.raw.0.len() <= 13 { continue; }
                println!("shape={shape_index} component={component_index} type={:?} len={} points={points:?}", shape.ty, info.raw.0.len());
                for (offset, chunk) in info.raw.0.chunks(16).enumerate() {
                    print!("{:04x}: ", offset * 16);
                    for byte in chunk { print!("{byte:02x} "); }
                    println!();
                }
                println!();
            }
        }
    }
}

fn main() {
    let path = std::env::args().nth(1).expect("missing TVG path");
    let file = std::fs::File::open(path).unwrap();
    let decoded = tvg::read::read(file).unwrap();
    for item in decoded {
        if let FileData::Main(items) = item {
            for item in items {
                match item {
                    FileData::LayerUnderlay(layer) | FileData::LayerColor(layer) | FileData::LayerLine(layer) | FileData::LayerOverlay(layer) => dump(&layer),
                    _ => {}
                }
            }
        }
    }
}
