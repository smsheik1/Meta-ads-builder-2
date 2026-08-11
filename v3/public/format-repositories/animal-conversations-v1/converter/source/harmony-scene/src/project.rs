//! Higher-level API for dealing with project files

use crate::fs::{FileSystem, FileSystemPath};
use crate::palette::{PaletteList, PaletteListFile};
use crate::xstage::{
    ColorSpace, CompositeMode, XmlColumn, XmlColumnContents, XmlCompositeAttrs, XmlNodeAttrs,
    XmlPegAttrs, XmlProject, XmlReadAttrs, XmlScene, XmlSceneLink, XmlSceneNodeItem,
};
use quick_xml::de::from_str;
use std::collections::{BTreeMap, HashMap};
use std::ops::RangeInclusive;
use std::str::FromStr;
use std::{fmt, io};
use thiserror::Error;

#[derive(Clone)]
pub struct Project<Path> {
    pub directory: Path,
    pub xml_project: XmlProject,
    pub elements: BTreeMap<u64, Element<Path>>,
    pub scenes: Vec<Scene>,
    pub palettes: PaletteList,
}

impl<Path: fmt::Debug> fmt::Debug for Project<Path> {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.debug_struct("Project")
            .field("directory", &self.directory)
            .field("elements", &self.elements)
            .field("scenes", &self.scenes)
            .field("palettes", &self.palettes)
            .finish_non_exhaustive()
    }
}

#[derive(Debug, Clone)]
pub struct Element<Path> {
    pub directory: Path,
    pub name: String,
    pub drawings: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Scene {
    /// Element columns, by name
    pub el_cols: HashMap<String, ElementColumn>,
    pub nodes: NodeGraph,
}

#[derive(Debug, Clone)]
pub struct NodeGraph {
    /// Nodes, by name
    pub nodes: HashMap<String, Node>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Clone)]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    pub from_port: Option<u64>,
    pub to_port: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct Node {
    pub name: String,
    pub pos: [i64; 3],
    pub data: NodeData,
}

#[derive(Debug, Clone)]
pub enum NodeData {
    Composite(CompositeNode),
    Peg(PegNode),
    Read(ReadNode),
    Group(NodeGraph),
}

#[derive(Debug, Clone)]
pub struct CompositeNode {
    pub mode: CompositeMode,
    pub flatten_output: bool,
    // ...
}

#[derive(Debug, Clone)]
pub struct PegNode {
    pub enable_3d: bool,
    pub position: [f64; 3],
    pub scale: [f64; 3],
    pub rotation: [f64; 3],
    pub angle: f64,
    pub skew: f64,
    pub pivot: [f64; 3],
    pub spline_offset: [f64; 3],
    // ...
}

#[derive(Debug, Clone)]
pub struct ReadNode {
    pub enable_3d: bool,
    pub offset: [f64; 3],
    pub scale: [f64; 3],
    pub rotation: [f64; 3],
    pub angle: f64,
    pub skew: f64,
    pub pivot: [f64; 3],
    pub spline_offset: [f64; 3],
    pub element_column: String,
    pub color_space: ColorSpace,
    // ...
}

fn parse_xyz<T: std::str::FromStr<Err = E>, E: std::error::Error>(s: &str) -> io::Result<[T; 3]> {
    let mut entries = s.split(',');
    let x = entries
        .next()
        .ok_or(io::Error::new(io::ErrorKind::InvalidData, "expected x"))?
        .parse()
        .map_err(|e| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("failed to parse x: {e}"),
            )
        })?;
    let y = entries
        .next()
        .ok_or(io::Error::new(io::ErrorKind::InvalidData, "expected y"))?
        .parse()
        .map_err(|e| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("failed to parse y: {e}"),
            )
        })?;
    let z = entries
        .next()
        .ok_or(io::Error::new(io::ErrorKind::InvalidData, "expected z"))?
        .parse()
        .map_err(|e| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("failed to parse z: {e}"),
            )
        })?;
    if entries.next().is_some() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "unexpected extra entry in x,y,z",
        ));
    }
    Ok([x, y, z])
}

impl NodeGraph {
    pub fn from_xml(xml_nodes: &[XmlSceneNodeItem], links: &[XmlSceneLink]) -> io::Result<Self> {
        let mut nodes = HashMap::new();
        for node in xml_nodes {
            match node {
                XmlSceneNodeItem::Group(group) => {
                    let graph =
                        NodeGraph::from_xml(&group.nodeslist.contents, &group.linkedlist.contents)?;

                    nodes.insert(
                        group.name.clone(),
                        Node {
                            name: group.name.clone(),
                            pos: parse_xyz(&group.pos)?,
                            data: NodeData::Group(graph),
                        },
                    );
                }
                XmlSceneNodeItem::Node(node) => {
                    let node_data = match &node.attrs {
                        XmlNodeAttrs::Composite(composite) => {
                            NodeData::Composite(CompositeNode::from_xml(composite))
                        }
                        XmlNodeAttrs::Peg(peg) => NodeData::Peg(PegNode::from_xml(peg)),
                        XmlNodeAttrs::Read(read) => NodeData::Read(ReadNode::from_xml(read)),
                        _ => {
                            // ignore the rest for now
                            continue;
                        }
                    };
                    nodes.insert(
                        node.name.clone(),
                        Node {
                            name: node.name.clone(),
                            pos: parse_xyz(&node.pos)?,
                            data: node_data,
                        },
                    );
                }
            }
        }

        let edges = links
            .iter()
            .map(|link| GraphEdge {
                from: link.out.clone(),
                to: link.input.clone(),
                from_port: link.out_port,
                to_port: link.in_port,
            })
            .collect();

        Ok(Self { nodes, edges })
    }
}

impl Scene {
    pub fn from_xml(xml: &XmlScene) -> io::Result<Self> {
        let mut el_cols = HashMap::new();
        for el_col in xml.columns.contents.iter().filter(|col| col.ty == 0) {
            let col = ElementColumn::from_xml(el_col)?;
            el_cols.insert(col.name.clone(), col);
        }

        let nodes = NodeGraph::from_xml(
            &xml.rootgroup.nodeslist.contents,
            &xml.rootgroup.linkedlist.contents,
        )?;

        Ok(Self { el_cols, nodes })
    }
}

impl CompositeNode {
    pub fn from_xml(xml: &XmlCompositeAttrs) -> Self {
        Self {
            mode: xml.composite_mode.val,
            flatten_output: xml.flatten_output.val,
        }
    }
}

impl PegNode {
    pub fn from_xml(xml: &XmlPegAttrs) -> Self {
        Self {
            enable_3d: xml.enable_3d.val,
            position: [xml.position.x.val, xml.position.y.val, xml.position.z.val],
            scale: if xml.scale.separate.val {
                [xml.scale.x.val, xml.scale.y.val, xml.scale.z.val]
            } else {
                [xml.scale.xy.val, xml.scale.xy.val, xml.scale.xy.val]
            },
            rotation: [
                xml.rotation.anglex.val,
                xml.rotation.angley.val,
                xml.rotation.anglez.val,
            ],
            angle: xml.angle.val,
            skew: xml.skew.val,
            pivot: [xml.pivot.x.val, xml.pivot.y.val, xml.pivot.z.val],
            spline_offset: [
                xml.spline_offset.x.val,
                xml.spline_offset.y.val,
                xml.spline_offset.z.val,
            ],
        }
    }
}

impl ReadNode {
    pub fn from_xml(xml: &XmlReadAttrs) -> Self {
        Self {
            enable_3d: xml.enable_3d.val,
            offset: [xml.offset.x.val, xml.offset.y.val, xml.offset.z.val],
            scale: if xml.scale.separate.val {
                [xml.scale.x.val, xml.scale.y.val, xml.scale.z.val]
            } else {
                [xml.scale.xy.val, xml.scale.xy.val, xml.scale.xy.val]
            },
            rotation: [
                xml.rotation.anglex.val,
                xml.rotation.angley.val,
                xml.rotation.anglez.val,
            ],
            angle: xml.angle.val,
            skew: xml.skew.val,
            pivot: [xml.pivot.x.val, xml.pivot.y.val, xml.pivot.z.val],
            spline_offset: [
                xml.spline_offset.x.val,
                xml.spline_offset.y.val,
                xml.spline_offset.z.val,
            ],
            element_column: xml.drawing.element.col.clone(),
            color_space: xml.color_space.val.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ElementColumn {
    pub name: String,
    pub element_id: u64,
    pub seq: Vec<ElementSeq>,
}

#[derive(Debug, Clone)]
pub struct ElementSeq {
    /// Range of frames for which this item is visible
    pub exposure_range: RangeInclusive<u64>,
    pub element_id: u64,
    pub element_value: String,
}

/// Parses syntax like `1`, `1-2`, `1-2,4`
fn parse_exposure_ranges(
    exposures: &str,
) -> Result<Vec<RangeInclusive<u64>>, std::num::ParseIntError> {
    let mut ranges = Vec::new();
    for range in exposures.split(',') {
        if let Some((start, end)) = range.split_once('-') {
            ranges.push(start.parse()?..=end.parse()?);
        } else {
            let value = range.parse()?;
            ranges.push(value..=value);
        }
    }
    Ok(ranges)
}

impl ElementColumn {
    pub fn from_xml(xml: &XmlColumn) -> io::Result<Self> {
        if xml.ty != 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "not an element column",
            ));
        }
        let Some(element_id) = xml.id else {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "element column has no ID",
            ));
        };

        let mut seq = Vec::new();
        for item in &xml.contents {
            match item {
                XmlColumnContents::ElementSeq(xml_seq) => {
                    let ranges = parse_exposure_ranges(&xml_seq.exposures)
                        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
                    for range in ranges {
                        seq.push(ElementSeq {
                            exposure_range: range,
                            element_id,
                            element_value: xml_seq.val.clone(),
                        });
                    }
                }
                _ => (),
            }
        }
        seq.sort_by_key(|seq| *seq.exposure_range.start());

        Ok(Self {
            name: xml.name.clone(),
            element_id,
            seq,
        })
    }
}

#[derive(Debug, Error)]
pub enum ProjectReadError {
    #[error("failed to read .xstage file: {0}")]
    ReadXstage(io::Error),
    #[error("failed to parse .xstage file: {0}")]
    ParseXstage(quick_xml::de::DeError),
    #[error("failed to read PALETTE_LIST: {0}")]
    ReadPaletteList(io::Error),
    #[error("failed to read palettes: {0}")]
    ReadPalettes(io::Error),
}

impl<Path: FileSystemPath> Project<Path> {
    /// Opens a project from the file system. Requires file system access
    pub fn open(
        fs: &impl FileSystem<Path = Path>,
        xstage_file_path: Path,
    ) -> Result<Self, ProjectReadError> {
        let mut directory = xstage_file_path.clone();
        directory.pop();

        let xstage = fs
            .read_to_string(&xstage_file_path)
            .map_err(ProjectReadError::ReadXstage)?;
        let xml_project: XmlProject = from_str(&xstage).map_err(ProjectReadError::ParseXstage)?;

        let mut elements = BTreeMap::new();
        for element in &xml_project.elements.contents {
            let directory = directory
                .join_str(&element.root_folder)
                .join_str(&element.element_folder);

            elements.insert(
                element.id,
                Element {
                    directory,
                    name: element.element_name.clone(),
                    drawings: element
                        .drawings
                        .contents
                        .iter()
                        .map(|d| d.name.clone())
                        .collect(),
                },
            );
        }

        let mut scenes = Vec::with_capacity(xml_project.scenes.contents.len());
        for scene in &xml_project.scenes.contents {
            scenes.push(Scene::from_xml(scene).map_err(ProjectReadError::ReadXstage)?);
        }

        let palette_list_path = directory.join_str("PALETTE_LIST");
        let palette_list = fs
            .read_to_string(&palette_list_path)
            .map_err(ProjectReadError::ReadPaletteList)?;
        let palette_list =
            PaletteListFile::from_str(&palette_list).map_err(ProjectReadError::ReadPaletteList)?;
        let palettes = PaletteList::read_all(fs, &directory, &palette_list)
            .map_err(ProjectReadError::ReadPalettes)?;

        Ok(Self {
            directory,
            xml_project,
            elements,
            scenes,
            palettes,
        })
    }
}

impl<Path: FileSystemPath> Element<Path> {
    /// Returns the file path for a particular TVG file.
    pub fn tvg_path(&self, val: &str) -> Path {
        self.directory
            .join_str(&format!("{}-{val}.tvg", &self.name))
    }
}
