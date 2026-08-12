use tvg::palette::ColorData;
use tvg::read::FileData;

fn walk(items: &[FileData]) {
    for item in items {
        match item {
            FileData::Main(children) => walk(children),
            FileData::Palette(palette) => {
                for entry in &palette.colors {
                    let mut id = None;
                    let mut name = None;
                    let mut rgba = None;
                    for tag in &entry.tags {
                        match tag {
                            ColorData::ColorId { id: value, name: value_name, .. } => {
                                id = Some(*value);
                                name = Some(value_name.as_str());
                            }
                            ColorData::ColorRgba(r, g, b, a) => rgba = Some((*r, *g, *b, *a)),
                        }
                    }
                    if let (Some(id), Some(name), Some(rgba)) = (id, name, rgba) {
                        println!("{id:016x}\t{name}\t{rgba:?}");
                    }
                }
            }
            _ => {}
        }
    }
}

fn main() {
    let source = std::env::args().nth(1).expect("missing TVG path");
    let decoded = tvg::read::read(std::fs::File::open(source).unwrap()).unwrap();
    walk(&decoded);
}
