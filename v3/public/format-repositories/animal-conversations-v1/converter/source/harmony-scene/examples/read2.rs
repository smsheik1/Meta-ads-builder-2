use harmony_scene::fs::OsFileSystem;
use harmony_scene::*;
use std::path::PathBuf;

/// test utility
fn main() {
    let xstage_path = PathBuf::from(std::env::args().skip(1).next().expect("missing argument"));

    {
        let file = std::fs::read_to_string(&xstage_path).unwrap();

        let stage: xstage::XmlProject = quick_xml::de::from_str(&file)
            .map_err(|e| e.to_string())
            .unwrap();

        // println!("{:?}", stage.elements);
        println!("{:?}", stage.scenes.contents[0].columns);
    }

    let project = project::Project::open(&OsFileSystem, xstage_path)
        .map_err(|e| e.to_string())
        .unwrap();
    println!("{project:?}");
}
