//! XML deserialization structs for `.xstage` files

use serde::de::{self, DeserializeSeed, MapAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use std::fmt;

/// XML root `<project>` node
#[derive(Debug, Clone, Deserialize)]
pub struct XmlProject {
    /// The software that created this file.
    ///
    /// Example: `Harmony Premium (Harmony Premium) version 21.1.0 build 18399 2022-05-10 10:58:00`
    #[serde(rename = "@source")]
    pub source: String,
    /// The version of the software.
    ///
    /// Example: `2110`
    #[serde(rename = "@version")]
    pub version: u64,
    /// The build number of the software.
    ///
    /// Example: `18399`
    #[serde(rename = "@build")]
    pub build: u64,
    /// Some kind of identifier for the software.
    ///
    /// Example: `harmony`
    #[serde(rename = "@creator")]
    pub creator: String,

    pub elements: XmlList<XmlElement>,
    pub options: XmlList<XmlOption>,
    pub scenes: XmlList<XmlScene>,
    // pub symbols: Vec<XmlSymbol>, TODO
    pub timeline: XmlTimeline,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlTimeline {
    pub scene: XmlTimelineScene,
}
#[derive(Debug, Clone, Deserialize)]
pub struct XmlTimelineScene {
    #[serde(rename = "@id")]
    pub id: String, // TODO: hex string
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlList<T> {
    #[serde(rename = "$value")]
    pub contents: Vec<T>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlElement {
    #[serde(rename = "@id")]
    pub id: u64,
    #[serde(rename = "@elementName")]
    pub element_name: String,
    #[serde(rename = "@elementFolder")]
    pub element_folder: String,
    #[serde(rename = "@pixmapFormat")]
    pub pixmap_format: u64,
    #[serde(rename = "@scanType")]
    pub scan_type: u64,
    #[serde(rename = "@fieldChart")]
    pub field_chart: f64,
    #[serde(rename = "@vectorType")]
    pub vector_type: u64,
    #[serde(rename = "@rootFolder")]
    pub root_folder: String,
    pub drawings: XmlList<XmlElementDrawing>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlElementDrawing {
    #[serde(rename = "@name")]
    pub name: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
pub enum ColorSpace {
    Linear,
    #[serde(rename = "Display P3")]
    DisplayP3,
    #[serde(rename = "Display P3 Linear")]
    DisplayP3Linear,
    #[serde(rename = "Rec.709")]
    Rec709,
    #[serde(rename = "Rec.709 2.4")]
    Rec709Gamma24,
    #[serde(rename = "Rec.2020")]
    Rec2020,
    #[serde(rename = "Rec.2020 2.4")]
    Rec2020Gamma24,
    #[serde(rename = "Rec.2020 Linear")]
    Rec2020Linear,
    #[serde(rename = "sRGB")]
    #[default]
    Srgb,
}

#[derive(Debug, Clone, Deserialize)]
pub enum FovFitType {
    VerticalFitFov,
    HorizontalFitFov,
    CustomFov,
}

#[derive(Debug, Clone, Deserialize)]
pub enum ProjectionType {
    PerspectiveProjection,
    /// Orthographic
    OrthogonalProjection,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum XmlOption {
    /// Alignment tab in Scene Settings
    Metrics {
        #[serde(rename = "@unitAspectRatioX")]
        unit_aspect_ratio_x: f64,
        #[serde(rename = "@unitAspectRatioY")]
        unit_aspect_ratio_y: f64,
        #[serde(rename = "@numberOfUnitsX")]
        number_of_units_x: f64,
        #[serde(rename = "@numberOfUnitsY")]
        number_of_units_y: f64,
        #[serde(rename = "@numberOfUnitsZ")]
        number_of_units_z: f64,
    },
    Resolution {
        /// Resolution preset name (e.g. `HDTV_1080p24`). None if no preset is selected.
        #[serde(rename = "@name")]
        name: Option<String>,
        /// Size (e.g. `1920,1080`)
        #[serde(rename = "@size")]
        size: String, // TODO: w,h string
        #[serde(rename = "@fovFit")]
        fov_fit: FovFitType,
        /// Custom fov value
        #[serde(rename = "@fov")]
        fov: f64,
        #[serde(rename = "@projection")]
        projection: ProjectionType,
    },
    Framerate {
        #[serde(rename = "@val")]
        val: u32,
    },
    Zdragging {
        #[serde(rename = "@val")]
        val: bool,
    },
    ZOrderCompatibilityWith7_3 {
        #[serde(rename = "@val")]
        val: bool,
    },
    PixelPerModelUnitForVectorLayers {
        #[serde(rename = "@val")]
        val: f64,
    },
    PixelPerModelUnitForBitmapLayers {
        #[serde(rename = "@val")]
        val: f64,
    },
    CanvasForBitmapLayers {
        #[serde(rename = "@size")]
        size: String, // TODO: w,h string
    },
    CameraInSymbols {
        #[serde(rename = "@val")]
        val: bool,
    },
    ScaleFactor {
        #[serde(rename = "@val")]
        val: f64,
    },
    /// “Working Colour Space” (sRGB by default)
    ColorSpace {
        #[serde(rename = "@val")]
        val: ColorSpace,
    },
    /// “Read Toon Boom Drawings using sRGB colour space” (enabled by default)
    ConvertPalettesColorSpace {
        #[serde(rename = "@val")]
        val: bool,
    },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlScene {
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@id")]
    pub id: String, // TODO: hex string
    #[serde(rename = "@nbframes")]
    pub nbframes: u64,
    #[serde(rename = "@startFrame")]
    pub start_frame: u64,
    #[serde(rename = "@stopFrame")]
    pub stop_frame: u64,
    pub columns: XmlList<XmlColumn>,
    pub options: XmlList<XmlSceneOption>,
    pub rootgroup: XmlSceneRootgroup,
    pub unconnected_composite: XmlSceneUnconnectedComposite,
    pub metas: XmlList<XmlSceneMeta>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlColumn {
    /// column type
    /// - 0: elementSeq
    /// - 2: 3D path
    /// - 3: points
    #[serde(rename = "@type")]
    pub ty: u64,
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@displayOrder")]
    pub display_order: u64,
    #[serde(rename = "@width")]
    pub width: Option<u64>,
    #[serde(rename = "@anonymous")]
    pub anonymous: bool,
    #[serde(rename = "@id")]
    pub id: Option<u64>,
    #[serde(rename = "$value", default)]
    pub contents: Vec<XmlColumnContents>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum XmlColumnContents {
    ElementSeq(XmlColumnElementSeq),
    Step {
        #[serde(rename = "@val")]
        val: u64,
        #[serde(rename = "@start")]
        start: u64,
        #[serde(rename = "@stop")]
        stop: u64,
    },
    InfoX {
        #[serde(rename = "@width")]
        width: u64,
    },
    InfoY {
        #[serde(rename = "@width")]
        width: u64,
    },
    InfoZ {
        #[serde(rename = "@width")]
        width: u64,
    },
    InfoVelocity {
        #[serde(rename = "@width")]
        width: u64,
    },
    Path3D(XmlColumnPath3d),
    Points(XmlColumnPoints),
    Velocity(XmlColumnVelocity),
    NoFrames,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlColumnElementSeq {
    /// exposure range: `1` or `1-4`
    #[serde(rename = "@exposures")]
    pub exposures: String,
    // drawing file name
    #[serde(rename = "@val")]
    pub val: String,
    #[serde(rename = "@id")]
    pub id: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlColumnPath3d {
    #[serde(rename = "@useVeloX")]
    pub use_velo_x: bool,
    #[serde(rename = "@useVeloY")]
    pub use_velo_y: bool,
    #[serde(rename = "@useVeloZ")]
    pub use_velo_z: bool,
    #[serde(rename = "@constantZ")]
    pub constant_z: bool,
    pub points: XmlList<XmlColumnPath3dPoint>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlColumnPath3dPoint {
    #[serde(rename = "@val")]
    pub val: String, // TODO: x,y,z string
    #[serde(rename = "@lockedInTime")]
    pub locked_in_time: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlColumnPoints {
    #[serde(rename = "@version")]
    pub version: u64,
    #[serde(rename = "$value")]
    pub points: Vec<XmlColumnPoint>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlColumnPoint {
    #[serde(rename = "@constSeg")]
    pub const_seg: bool,
    /// Range expression (e.g. `2` or `2-4`)
    #[serde(rename = "@x")]
    pub x: String,
    #[serde(rename = "@yLocal")]
    pub y_local: f64,
    #[serde(rename = "@y")]
    pub y: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlColumnVelocity {
    #[serde(rename = "@type")]
    pub ty: u32,
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@displayOrder")]
    pub display_order: u64,
    #[serde(rename = "@width")]
    pub width: u64,
    #[serde(rename = "@anonymous")]
    pub anonymous: bool,
    #[serde(rename = "$value")]
    pub contents: Vec<XmlColumnContents>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum XmlSceneOption {
    Camera {
        #[serde(rename = "@val")]
        val: String,
    },
    DefaultDisplay {
        #[serde(rename = "@val")]
        val: String,
    },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlSceneRootgroup {
    #[serde(rename = "@name")]
    pub name: String,
    pub options: XmlSceneRootgroupOptions,
    pub nodeslist: XmlList<XmlSceneNodeItem>,
    pub linkedlist: XmlList<XmlSceneLink>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlSceneUnconnectedComposite {
    pub module: XmlSceneNode,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlSceneMeta {
    #[serde(rename = "@type")]
    pub ty: String,
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@creator")]
    pub creator: String,
    #[serde(rename = "@version")]
    pub version: String,
    // TODO: arbitrary contents
}

#[derive(Debug, Clone, Deserialize)]
pub struct Val<T> {
    #[serde(rename = "@val")]
    pub val: T,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ValWithDefault<T> {
    #[serde(rename = "@val")]
    pub val: T,
    #[serde(rename = "@defaultValue")]
    pub default_value: T,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlSceneRootgroupOptions {
    pub collapsed: Val<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlSceneLink {
    #[serde(rename = "@out")]
    pub out: String,
    #[serde(rename = "@in")]
    pub input: String,
    #[serde(rename = "@outport")]
    pub out_port: Option<u64>,
    #[serde(rename = "@inport")]
    pub in_port: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub enum XmlSceneNodeItem {
    #[serde(rename = "group")]
    Group(XmlSceneNodeGroup),
    #[serde(rename = "module")]
    Node(XmlSceneNode),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlSceneNodeGroup {
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@pos")]
    pub pos: String,
    pub options: XmlSceneNodeGroupOptions,
    pub nodeslist: XmlList<XmlSceneNodeItem>,
    pub linkedlist: XmlList<XmlSceneLink>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlSceneNodeGroupOptions {
    pub collapsed: Val<bool>,
    pub subnode_collapsed: Val<bool>,
    pub shows_published: Val<bool>,
}

#[derive(Debug, Clone)]
pub struct XmlSceneNode {
    pub ty: String,
    pub name: String,
    pub pos: String, // TODO: x,y,z string
    pub publish_under_tab: Option<String>,
    pub options: XmlNodeOptions,
    pub attrs: XmlNodeAttrs,
    /// present on `MULTIPORT_IN`, `MULTIPORT_OUT`
    pub ports: Vec<XmlSceneNodePort>,
    /// present on `COLOR_OVERRIDE_TVG`
    pub override_colors: Vec<XmlOverrideColor>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlNodeOptions {
    pub disabled: Option<Val<bool>>,
    pub collapsed: Val<bool>,
    pub version: Val<u64>,

    // present on `COLOR_OVERRIDE_TVG`
    pub selected_only: Option<Val<bool>>,
    pub render_mode: Option<Val<String>>,
    pub apply_to_matte_ports: Option<Val<bool>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlSceneNodePort {
    #[serde(rename = "@type")]
    pub ty: String,
    #[serde(rename = "@idx")]
    pub index: u64,
}

#[derive(Debug, Clone)]
pub enum XmlNodeAttrs {
    Composite(XmlCompositeAttrs),
    Write(XmlWriteAttrs),
    Read(XmlReadAttrs),
    Camera(XmlCameraAttrs),
    Peg(XmlPegAttrs),
    ColorCard(XmlColorCardAttrs),
    Fade(XmlFadeAttrs),
    LineArt(XmlLineArtAttrs),
    TbdColorSelector(XmlTbdColorSelectorAttrs),
    ImageSwitch(XmlImageSwitchAttrs),
    LuminanceThreshold(XmlLuminanceThresholdAttrs),
    GaussianBlurPlugin(XmlGaussianBlurPluginAttrs),
    Contrast(XmlContrastAttrs),
    ColorLevels(XmlColorLevelsAttrs),
    Display,
    MultiportIn,
    MultiportOut,
    ColorOverrideTvg,

    Unknown,
}

impl XmlNodeAttrs {
    pub fn get_empty_type(ty: &str) -> Option<Self> {
        match ty {
            "DISPLAY" => Some(Self::Display),
            "MULTIPORT_IN" => Some(Self::MultiportIn),
            "MULTIPORT_OUT" => Some(Self::MultiportOut),
            "COLOR_OVERRIDE_TVG" => Some(Self::ColorOverrideTvg),
            _ => None,
        }
    }

    pub fn deserialize<'de, D>(ty: &str, d: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        Ok(match ty {
            "COMPOSITE" => Self::Composite(XmlCompositeAttrs::deserialize(d)?),
            "WRITE" => Self::Write(XmlWriteAttrs::deserialize(d)?),
            "READ" => Self::Read(XmlReadAttrs::deserialize(d)?),
            "CAMERA" => Self::Camera(XmlCameraAttrs::deserialize(d)?),
            "PEG" => Self::Peg(XmlPegAttrs::deserialize(d)?),
            "COLOR_CARD" => Self::ColorCard(XmlColorCardAttrs::deserialize(d)?),
            "FADE" => Self::Fade(XmlFadeAttrs::deserialize(d)?),
            "LINE_ART" => Self::LineArt(XmlLineArtAttrs::deserialize(d)?),
            "TbdColorSelector" => Self::TbdColorSelector(XmlTbdColorSelectorAttrs::deserialize(d)?),
            "ImageSwitch" => Self::ImageSwitch(XmlImageSwitchAttrs::deserialize(d)?),
            "LuminanceThreshold" => {
                Self::LuminanceThreshold(XmlLuminanceThresholdAttrs::deserialize(d)?)
            }
            "GAUSSIANBLUR-PLUGIN" => {
                Self::GaussianBlurPlugin(XmlGaussianBlurPluginAttrs::deserialize(d)?)
            }
            "CONTRAST" => Self::Contrast(XmlContrastAttrs::deserialize(d)?),
            "COLOR_LEVELS" => Self::ColorLevels(XmlColorLevelsAttrs::deserialize(d)?),
            _ => {
                <() as Deserialize>::deserialize(d)?;
                Self::Unknown
            }
        })
    }
}

impl<'de> Deserialize<'de> for XmlSceneNode {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(field_identifier)]
        #[serde(rename_all = "camelCase")]
        enum Field {
            #[serde(rename = "@type")]
            Type,
            #[serde(rename = "@name")]
            Name,
            #[serde(rename = "@pos")]
            Pos,
            #[serde(rename = "@publishUnderTab")]
            PublishUnderTab,
            Options,
            Attrs,
            Ports,
            OverrideColors,
        }

        struct AttrsSeed {
            ty: String,
        }
        impl<'de> DeserializeSeed<'de> for AttrsSeed {
            type Value = XmlNodeAttrs;
            fn deserialize<D>(self, deserializer: D) -> Result<Self::Value, D::Error>
            where
                D: Deserializer<'de>,
            {
                XmlNodeAttrs::deserialize(&self.ty, deserializer)
                    .map_err(|e| de::Error::custom(format!("error in {} node: {e}", self.ty)))
            }
        }

        struct StructVisitor;
        impl<'de> Visitor<'de> for StructVisitor {
            type Value = XmlSceneNode;

            fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
                write!(f, "a <module>")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut ty: Option<String> = None;
                let mut name: Option<String> = None;
                let mut pos: Option<String> = None;
                let mut publish_under_tab: Option<String> = None;
                let mut options: Option<XmlNodeOptions> = None;
                let mut attrs = XmlNodeAttrs::Unknown;
                let mut ports: XmlList<XmlSceneNodePort> = XmlList {
                    contents: Vec::new(),
                };
                let mut override_colors: XmlList<XmlOverrideColor> = XmlList {
                    contents: Vec::new(),
                };

                while let Some(key) = map.next_key()? {
                    match key {
                        Field::Type => {
                            let value: String = map.next_value()?;
                            if let Some(data) = XmlNodeAttrs::get_empty_type(&value) {
                                attrs = data;
                            }
                            ty = Some(value);
                        }
                        Field::Name => {
                            name = Some(map.next_value()?);
                        }
                        Field::Pos => {
                            pos = Some(map.next_value()?);
                        }
                        Field::PublishUnderTab => {
                            publish_under_tab = Some(map.next_value()?);
                        }
                        Field::Options => {
                            options = Some(map.next_value()?);
                        }
                        Field::Attrs => {
                            let Some(ty) = ty.clone() else {
                                return Err(de::Error::missing_field(
                                    "@type (must come before attrs)",
                                ));
                            };

                            attrs = map.next_value_seed(AttrsSeed { ty })?;
                        }
                        Field::Ports => {
                            ports = map.next_value()?;
                        }
                        Field::OverrideColors => {
                            override_colors = map.next_value()?;
                        }
                    }
                }

                let ty = ty.ok_or_else(|| de::Error::missing_field("@type"))?;
                let name = name.ok_or_else(|| de::Error::missing_field("@name"))?;
                let pos = pos.ok_or_else(|| de::Error::missing_field("@pos"))?;
                let options = options.ok_or_else(|| de::Error::missing_field("options"))?;
                Ok(XmlSceneNode {
                    ty,
                    name,
                    pos,
                    publish_under_tab,
                    options,
                    attrs,
                    ports: ports.contents,
                    override_colors: override_colors.contents,
                })
            }
        }

        deserializer.deserialize_struct(
            "module",
            &[
                "@type",
                "@name",
                "@pos",
                "@publishUnderTab",
                "options",
                "attrs",
                "ports",
            ],
            StructVisitor,
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CompositeMode {
    /// “As Bitmap”
    CompositeBitmap,
    /// “As Seamless Bitmap”
    CompositeVectorToBitmap,
    /// “As Vector”
    CompositeVector,
    /// “Pass Through
    CompositePassthrough,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum CompositeOutputZ {
    Leftmost,
    Rightmost,
    Frontmost,
    Backmost,
    PortNumber,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlCompositeAttrs {
    pub composite_mode: Val<CompositeMode>,
    pub flatten_output: Val<bool>,
    pub flatten_vector: Val<bool>,
    pub composite2d: Val<bool>,
    pub composite3d: Val<bool>,
    pub output_z: Val<CompositeOutputZ>,
    pub output_z_input_port: Val<u64>,
    pub apply_focus: Val<bool>,
    /// Bitmap focus multiplier
    pub multiplier: ValWithDefault<u64>,
    pub tvg_palette: Val<String>,
    pub merge_vector: Val<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlWriteAttrs {
    pub export_to_movie: Val<bool>,
    pub drawing_name: Val<String>,
    pub movie_path: Val<String>,
    pub movie_format: Val<String>,
    pub movie_audio: (),
    pub movie_video: (),
    pub movie_videoaudio: (),
    pub leading_zeros: Val<u64>,
    pub start: Val<u64>,
    pub drawing_type: Val<String>,
    pub enabling: (), // TODO: fields
    pub script_movie: Val<bool>,
    pub script_editor: Val<String>,
    pub color_space: Val<Option<ColorSpace>>,
    pub composite_partitioning: Val<String>,
    pub z_partition_range: ValWithDefault<u64>,
    pub clean_up_partition_folders: Val<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CameraAlignment {
    NoCameraAlignment,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AntialiasingQuality {
    LowNoTransparency,
    Low,
    MediumLow,
    Medium,
    High,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TextureFilter {
    Bilinear,
    Nearest,
    NearestFiltered,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AlignmentRule {
    Top,
    Left,
    Right,
    Bottom,
    CenterFit,
    CenterFill,
    CenterLr,
    CenterTb,
    Stretch,
    #[serde(rename = "ASIS")]
    AsIs,
    CenterFirstPage,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlReadAttrs {
    pub enable_3d: Val<bool>,
    pub face_camera: Val<bool>,
    pub camera_alignment: Val<CameraAlignment>,
    pub offset: XmlReadOffset,
    pub scale: XmlReadScale,
    pub rotation: XmlReadRotation,
    pub angle: ValWithDefault<f64>,
    pub skew: ValWithDefault<f64>,
    pub pivot: XmlXyz,
    pub spline_offset: XmlXyz,
    pub ignore_parent_peg_scaling: Val<bool>,
    pub disable_field_rendering: Val<bool>,
    pub depth: Val<f64>,
    pub enable_min_max_angle: Val<bool>,
    pub min_angle: ValWithDefault<f64>,
    pub max_angle: ValWithDefault<f64>,
    pub nail_for_children: Val<bool>,
    pub ik_hold_orientation: Val<bool>,
    pub ik_hold_x: Val<bool>,
    pub ik_hold_y: Val<bool>,
    pub ik_excluded: Val<bool>,
    pub ik_can_rotate: Val<bool>,
    pub ik_can_translate_x: Val<bool>,
    pub ik_can_translate_y: Val<bool>,
    pub ik_bone_x: ValWithDefault<f64>,
    pub ik_bone_y: ValWithDefault<f64>,
    pub ik_stiffness: ValWithDefault<f64>,
    pub drawing: XmlReadDrawing,
    pub read_overlay: Val<bool>,
    pub read_line_art: Val<bool>,
    pub read_color_art: Val<bool>,
    pub read_underlay: Val<bool>,
    pub overlay_art_drawing_mode: Val<String>, // TODO: enums
    pub line_art_drawing_mode: Val<String>,
    pub color_art_drawing_mode: Val<String>,
    pub underlay_art_drawing_mode: Val<String>,
    pub pencil_line_deformation_preserve_thickness: Val<bool>,
    pub pencil_line_deformation_quality: Val<String>, // TODO: enum
    pub pencil_line_deformation_smooth: Val<f64>,
    pub pencil_line_deformation_fit_error: ValWithDefault<f64>,
    pub read_color: Val<bool>,
    pub read_transparency: Val<bool>,
    pub color_transformation: Val<String>,
    pub color_space: Val<Option<ColorSpace>>,
    pub apply_matte_to_color: Val<String>,
    pub enable_line_texture: Val<bool>,
    pub antialiasing_quality: Val<AntialiasingQuality>,
    pub antialiasing_exponent: ValWithDefault<f64>,
    pub opacity: ValWithDefault<f64>,
    pub texture_filter: Val<TextureFilter>,
    pub adjust_pencil_thickness: Val<bool>,
    pub normal_line_art_thickness: Val<bool>,
    pub zoom_independent_line_art_thickness: Val<String>, // TODO: enum
    pub mult_line_art_thickness: ValWithDefault<f64>,
    pub add_line_art_thickness: ValWithDefault<f64>,
    pub min_line_art_thickness: ValWithDefault<f64>,
    pub max_line_art_thickness: ValWithDefault<f64>,
    pub use_drawing_pivot: Val<String>, // TODO: enum
    pub flip_hor: Val<bool>,
    pub flip_vert: Val<bool>,
    pub turn_before_alignment: Val<bool>,
    pub no_clipping: Val<bool>,
    pub x_clip_factor: Val<bool>,
    pub y_clip_factor: Val<bool>,
    pub alignment_rule: Val<AlignmentRule>,
    pub morphing_velo: ValWithDefault<f64>,
    pub can_animate: Val<bool>,
    pub tile_horizontal: Val<bool>,
    pub tile_vertical: Val<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlCameraAttrs {
    pub offset: XmlXyz,
    pub pivot: XmlXy,
    pub angle: ValWithDefault<f64>,
    pub override_scene_fov: Val<bool>,
    pub fov: ValWithDefault<f64>,
    pub near_plane: ValWithDefault<f64>,
    pub far_plane: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlPegAttrs {
    pub enable_3d: Val<bool>,
    pub face_camera: Val<bool>,
    pub camera_alignment: Val<String>, // TODO: likely an enum
    pub position: XmlPegPosition,
    pub scale: XmlReadScale,
    pub rotation: XmlReadRotation,
    pub angle: ValWithDefault<f64>,
    pub skew: ValWithDefault<f64>,
    pub pivot: XmlXyz,
    pub spline_offset: XmlXyz,
    pub ignore_parent_peg_scaling: Val<bool>,
    pub disable_field_rendering: Val<bool>,
    pub depth: Val<f64>,
    pub enable_min_max_angle: Val<bool>,
    pub min_angle: ValWithDefault<f64>,
    pub max_angle: ValWithDefault<f64>,
    pub nail_for_children: Val<bool>,
    pub ik_hold_orientation: Val<bool>,
    pub ik_hold_x: Val<bool>,
    pub ik_hold_y: Val<bool>,
    pub ik_excluded: Val<bool>,
    pub ik_can_rotate: Val<bool>,
    pub ik_can_translate_x: Val<bool>,
    pub ik_can_translate_y: Val<bool>,
    pub ik_bone_x: ValWithDefault<f64>,
    pub ik_bone_y: ValWithDefault<f64>,
    pub ik_stiffness: ValWithDefault<f64>,
    pub group_at_network_building: Val<bool>,
    pub add_composite_to_group: Val<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlColorCardAttrs {
    pub depth: Val<f64>,
    pub offset_z: ValWithDefault<f64>,
    pub color: XmlColor,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlColor {
    pub red: Val<f64>,
    pub green: Val<f64>,
    pub blue: Val<f64>,
    pub alpha: Val<f64>,
    pub preferred_ui: Val<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlReadOffset {
    pub separate: Val<bool>,
    pub x: ValWithDefault<f64>,
    pub y: ValWithDefault<f64>,
    pub z: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlPegPosition {
    pub separate: Val<bool>,
    pub attr3dpath: XmlAttr3dPath,
    pub x: ValWithDefault<f64>,
    pub y: ValWithDefault<f64>,
    pub z: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XmlAttr3dPath {
    #[serde(rename = "@col")]
    pub col: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlReadScale {
    pub separate: Val<bool>,
    pub in_fields: Val<bool>,
    pub xy: ValWithDefault<f64>,
    pub x: ValWithDefault<f64>,
    pub y: ValWithDefault<f64>,
    pub z: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlReadRotation {
    pub separate: Val<bool>,
    pub anglex: ValWithDefault<f64>,
    pub angley: ValWithDefault<f64>,
    pub anglez: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlXy {
    pub x: ValWithDefault<f64>,
    pub y: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlXyz {
    pub x: ValWithDefault<f64>,
    pub y: ValWithDefault<f64>,
    pub z: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlReadDrawing {
    pub element_mode: Val<bool>,
    pub element: XmlReadDrawingElement,
    pub custom_name: XmlReadDrawingCustomName,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlReadDrawingElement {
    #[serde(rename = "@col")]
    pub col: String,
    // TODO: contents: `<layer />`?
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlReadDrawingCustomName {
    pub name: Val<Option<String>>,
    pub extension: Val<String>,
    pub field_chart: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlFadeAttrs {
    pub transparency: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlLineArtAttrs {
    pub flatten: Val<bool>,
    pub apply_to_matte_ports: Val<bool>,
    pub antialiasing_quality: Val<String>,
    pub antialiasing_exponent: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlTbdColorSelectorAttrs {
    pub selectedcolors: XmlTbdColorSelectorColors,
    pub applytomatte: Val<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlTbdColorSelectorColors {
    pub val: XmlTbdColorSelectorColorsVal,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlTbdColorSelectorColorsVal {
    /// JSON string
    #[serde(rename = "$text")]
    pub value: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlImageSwitchAttrs {
    pub port_index: XmlImageSwitchPortIndex,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlImageSwitchPortIndex {
    #[serde(rename = "@val")]
    pub val: u64,
    #[serde(rename = "@col")]
    pub col: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlLuminanceThresholdAttrs {
    pub luminancethresholdthresh: ValWithDefault<f64>,
    pub luminancethresholdsoften: Val<bool>,
    pub luminancethresholdgamma: ValWithDefault<f64>,
    pub luminancethresholdgrey: Val<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlGaussianBlurPluginAttrs {
    pub truck_factor: Val<bool>,
    pub bidirectional: Val<bool>,
    pub precision: Val<String>,
    pub repeat_edge_pixels: Val<bool>,
    pub directional: Val<bool>,
    pub angle: ValWithDefault<f64>,
    pub iterations: Val<u64>,
    pub blurriness: ValWithDefault<f64>,
    pub vertical: ValWithDefault<f64>,
    pub horizontal: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlContrastAttrs {
    pub mid_point: ValWithDefault<f64>,
    /// [sic]
    pub dark_pixel_adjustement: ValWithDefault<f64>,
    pub bright_pixel_adjustement: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlColorLevelsAttrs {
    pub rgb: XmlColorLevelsChannel,
    pub red: XmlColorLevelsChannel,
    pub green: XmlColorLevelsChannel,
    pub blue: XmlColorLevelsChannel,
    pub alpha: XmlColorLevelsChannel,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlColorLevelsChannel {
    pub input_black: ValWithDefault<f64>,
    pub input_white: ValWithDefault<f64>,
    pub gamma: ValWithDefault<f64>,
    pub output_black: ValWithDefault<f64>,
    pub output_white: ValWithDefault<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlOverrideColor {
    pub color: XmlOverrideColorColor,
    pub rgba: Val<String>,
    pub mode: Val<String>,
    pub texture: Val<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmlOverrideColorColor {
    #[serde(rename = "@palette")]
    pub palette: String,
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@id")]
    pub id: String, // TODO: hex string
}
