use harmony_scene::fs::OsFileSystem;
use harmony_scene::project::{NodeData, NodeGraph, Project};
use std::path::PathBuf;

fn print_graph(graph: &NodeGraph, prefix: &str) {
    let mut names: Vec<_> = graph.nodes.keys().collect();
    names.sort();

    for name in names {
        let node = &graph.nodes[name];
        let path = if prefix.is_empty() {
            node.name.clone()
        } else {
            format!("{prefix}/{}", node.name)
        };

        match &node.data {
            NodeData::Read(read) => println!(
                "READ\t{path}\tcolumn={}\toffset={:?}\tscale={:?}\trotation={:?}\tangle={}\tpivot={:?}",
                read.element_column,
                read.offset,
                read.scale,
                read.rotation,
                read.angle,
                read.pivot
            ),
            NodeData::Peg(peg) => println!(
                "PEG\t{path}\tposition={:?}\tscale={:?}\trotation={:?}\tangle={}\tpivot={:?}",
                peg.position, peg.scale, peg.rotation, peg.angle, peg.pivot
            ),
            NodeData::Composite(_) => println!("COMPOSITE\t{path}"),
            NodeData::Group(group) => {
                println!("GROUP\t{path}");
                print_graph(group, &path);
            }
        }
    }

    let mut edges = graph.edges.clone();
    edges.sort_by(|a, b| {
        (&a.to, a.to_port, &a.from, a.from_port).cmp(&(&b.to, b.to_port, &b.from, b.from_port))
    });
    for edge in edges {
        let from = if prefix.is_empty() {
            edge.from
        } else {
            format!("{prefix}/{}", edge.from)
        };
        let to = if prefix.is_empty() {
            edge.to
        } else {
            format!("{prefix}/{}", edge.to)
        };
        println!(
            "EDGE\t{from}:{}\t{to}:{}",
            edge.from_port
                .map(|value| value.to_string())
                .unwrap_or_else(|| "-".into()),
            edge.to_port
                .map(|value| value.to_string())
                .unwrap_or_else(|| "-".into())
        );
    }
}

fn main() {
    let xstage_path = PathBuf::from(
        std::env::args()
            .nth(1)
            .expect("usage: inventory_scene <scene.xstage>"),
    );
    let project = Project::open(&OsFileSystem, xstage_path).expect("failed to open Harmony scene");

    println!("ELEMENTS\t{}", project.elements.len());
    for (id, element) in &project.elements {
        println!(
            "ELEMENT\t{id}\t{}\tdrawings={}\tvalues={}",
            element.name,
            element.drawings.len(),
            element.drawings.join(",")
        );
    }

    for (scene_index, scene) in project.scenes.iter().enumerate() {
        println!("SCENE\t{scene_index}\tcolumns={}", scene.el_cols.len());
        let mut column_names: Vec<_> = scene.el_cols.keys().collect();
        column_names.sort();
        for name in column_names {
            let column = &scene.el_cols[name];
            let exposures = column
                .seq
                .iter()
                .map(|item| {
                    format!(
                        "{}-{}:{}",
                        item.exposure_range.start(),
                        item.exposure_range.end(),
                        item.element_value
                    )
                })
                .collect::<Vec<_>>()
                .join(",");
            println!(
                "COLUMN\t{}\telement={}\texposures={}",
                column.name, column.element_id, exposures
            );
        }
        print_graph(&scene.nodes, "");
    }
}
