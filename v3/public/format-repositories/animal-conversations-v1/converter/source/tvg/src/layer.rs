use crate::pencil::{read_tgtb, StrokeThickness};
use crate::read::ReadError;
use crate::util::{read_encoded_data, Bytes};
use byteorder::{ReadBytesExt, LE};
use num_enum::{IntoPrimitive, TryFromPrimitive};
use std::io::{self, Read};

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(
    feature = "serde",
    serde(tag = "type", content = "content", rename_all = "snake_case")
)]
pub enum LayerData {
    Empty,
    Vector(Vec<VectorShape>),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, TryFromPrimitive, IntoPrimitive)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "snake_case"))]
#[repr(u16)]
pub enum ShapeType {
    Unknown0 = 0,
    Unknown1 = 1,
    Fill = 2,
    Stroke = 3,
    Unknown4 = 4,
    Unknown5 = 5,
    Line = 6,
    Unknown7 = 7,
    Unknown8 = 8,
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct VectorShape {
    #[cfg_attr(feature = "serde", serde(rename = "type"))]
    pub ty: ShapeType,
    pub components: Vec<ShapeComponent>,
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct ShapeComponent {
    pub tags: Vec<ShapeComponentData>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, TryFromPrimitive, IntoPrimitive)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[repr(u32)]
pub enum ShapeComponentTag {
    /// `TGSD`: seems to contain metadata
    Tgsd = 0x54475344,
    /// `TGBP`: contains a Bézier path
    Tgbp = 0x54474250,
    /// `tGTB`: pencil thickness
    Tgtb = 0x74475442,
    /// `tGTI`: seems to be related to the pencil
    Tgti = 0x74475449,
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(
    feature = "serde",
    serde(tag = "type", content = "content", rename_all = "snake_case")
)]
pub enum ShapeComponentData {
    Info(ComponentInfo),
    Path(Path),
    Thickness(StrokeThickness),
    Tgti(Bytes),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, TryFromPrimitive, IntoPrimitive)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "snake_case"))]
#[repr(u8)]
pub enum ComponentType {
    Fill = 0,
    Unknown1 = 1,
    Stroke = 2,
    Pencil = 4,
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct ComponentInfo {
    #[cfg_attr(feature = "serde", serde(rename = "type"))]
    pub ty: ComponentType,
    pub color_id: Option<u64>,
    pub raw: Bytes,
}

pub type Point = (f32, f32);

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Path {
    pub segments: Vec<PathSegment>,
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(
    feature = "serde",
    serde(tag = "type", content = "content", rename_all = "snake_case")
)]
pub enum PathSegment {
    Line(Point),
    Cubic(Point, Point, Point),
}

#[derive(Debug)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
enum PathSegmentType {
    Line,
    Cubic,
}

impl PathSegmentType {
    fn read<R>(mut input: R, points: u32) -> Result<Vec<PathSegmentType>, ReadError>
    where
        R: Read,
    {
        // curve instructions are encoded from LSB to MSB as a stream of little codes:
        // MSB 1001 0011 LSB -> read backwards: 1 1 001 001 (line, line, cubic, cubic)

        let mut current = input.read_u8()?;
        let mut pos = 0;

        let mut points_left = points;
        let mut out = Vec::with_capacity(points as usize / 3);
        let mut zeros = 0;
        while points_left > 0 {
            // read next bit
            let is_1 = {
                if pos > 7 {
                    current = input.read_u8()?;
                    pos -= 8;
                }
                let bit = (current & (1 << pos)) > 0;
                pos += 1;
                bit
            };

            if is_1 {
                match zeros {
                    0 => {
                        points_left -= 1;
                        out.push(PathSegmentType::Line);
                    }
                    2 => {
                        points_left -= 3;
                        out.push(PathSegmentType::Cubic);
                    }
                    n => {
                        return Err(ReadError::UnknownMystery(format!(
                            "unknown curve segment type {}",
                            n
                        )));
                    }
                }
                zeros = 0;
            } else {
                zeros += 1;
            }
        }
        Ok(out)
    }
}

impl Path {
    fn read<R>(mut input: R) -> Result<Self, ReadError>
    where
        R: Read,
    {
        let point_count = input.read_u32::<LE>()?;

        let segment_types = PathSegmentType::read(&mut input, point_count)?;
        let mut segments = Vec::new();

        macro_rules! read_point {
            () => {{
                let x = input.read_f32::<LE>()?;
                let y = input.read_f32::<LE>()?;
                (x, y)
            }};
        }

        for segment in segment_types {
            match segment {
                PathSegmentType::Line => {
                    segments.push(PathSegment::Line(read_point!()));
                }
                PathSegmentType::Cubic => {
                    segments.push(PathSegment::Cubic(
                        read_point!(),
                        read_point!(),
                        read_point!(),
                    ));
                }
            }
        }

        Ok(Path { segments })
    }
}

// what does this mean?
const LAYER_TRAILER: &[u8] = &[
    0x00, 0x54, 0x47, 0x52, 0x56, 0x08, 0x00, 0x00, 0x00, 0x3d, 0xdf, 0x4f, 0x8d,
];

pub fn read_layer_data<R>(mut input: R) -> Result<LayerData, ReadError>
where
    R: Read,
{
    let data = read_encoded_data(&mut input)?;
    trace!("layer:\n{:?}", Bytes(data.clone()));
    let mut input = io::BufReader::new(io::Cursor::new(data));

    let data_type = input.read_u16::<LE>()?;
    match data_type {
        0 => {
            // empty layer
            Ok(LayerData::Empty)
        }
        0x0100 => {
            // vector layer
            read_vector_layer(input)
        }
        ty => Err(ReadError::UnknownMystery(format!(
            "unexpected value of layer data type: {:04x?}",
            ty
        ))),
    }
}

fn read_vector_layer<R>(mut input: R) -> Result<LayerData, ReadError>
where
    R: Read,
{
    let mut shapes = Vec::new();

    let shape_count = input.read_u32::<LE>()?;
    let mut shape_index = 0;
    while shape_index < shape_count {
        let layer_ty = input.read_u32::<LE>()?;
        if layer_ty == u32::from_le_bytes(*b"tGTB") {
            let _ = read_tgtb(&mut input)?;
            continue;
        }
        if layer_ty == u32::from_le_bytes(*b"tGTI") {
            let len = input.read_u32::<LE>()?;
            let mut skipped = vec![0u8; len as usize];
            input.read_exact(&mut skipped)?;
            continue;
        }
        if layer_ty != 2 {
            return Err(ReadError::UnknownMystery(format!(
                "unexpected layer type: {:?}",
                layer_ty
            )));
        }
        let tgly = input.read_u32::<byteorder::BE>()?;
        if tgly != 0x54474c59 {
            return Err(ReadError::UnknownMystery(format!(
                "unexpected layer tag: {:08x?}",
                tgly
            )));
        }
        let shape_len = input.read_u32::<LE>()?;
        let mut input = (&mut input).take(shape_len as u64);

        let shape_type = match ShapeType::try_from(input.read_u16::<LE>()?) {
            Ok(ty) => ty,
            Err(err) => {
                let mut data = Vec::new();
                input.read_to_end(&mut data)?;
                trace!("{:?}", Bytes(data));
                return Err(ReadError::UnknownShapeType(err.number));
            }
        };

        let mut paths: Vec<ShapeComponent> = Vec::new();

        let component_count = input.read_u32::<LE>()?;
        let mut component_index = 0;
        while component_index < component_count {
            let tag = input.read_u32::<byteorder::BE>()?;
            if tag == 0x74475442 {
                if let Some(component) = paths.last_mut() {
                    component.tags.push(ShapeComponentData::Thickness(read_tgtb(&mut input)?));
                } else {
                    let _ = read_tgtb(&mut input)?;
                }
                continue;
            }
            if tag == 0x74475449 {
                let len = input.read_u32::<LE>()?;
                let mut data = vec![0u8; len as usize];
                input.read_exact(&mut data)?;
                if let Some(component) = paths.last_mut() {
                    component.tags.push(ShapeComponentData::Tgti(Bytes(data)));
                }
                continue;
            }
            if tag != 0x54475653 {
                // not TGVS
                return Err(ReadError::UnknownMystery(format!(
                    "unexpected shape component tag: {:08x?}",
                    tag
                )));
            }

            let len = input.read_u32::<LE>()?;
            let mut input = (&mut input).take(len as u64);

            let mut tags = Vec::new();
            loop {
                let tag = match input.read_u32::<byteorder::BE>() {
                    Ok(tag) => match ShapeComponentTag::try_from(tag) {
                        Ok(tag) => tag,
                        Err(err) => return Err(ReadError::UnknownComponentTag(err.number)),
                    },
                    Err(err) if err.kind() == io::ErrorKind::UnexpectedEof => break,
                    Err(err) => return Err(ReadError::Io(err)),
                };

                match tag {
                    ShapeComponentTag::Tgsd => {
                        let len = input.read_u32::<LE>()?;
                        {
                            let mut raw = vec![0u8; len as usize];
                            input.read_exact(&mut raw)?;
                            let mut input = io::Cursor::new(raw.clone());

                            let component_type = ComponentType::try_from(input.read_u8()?)
                                .map_err(|err| ReadError::UnknownComponentType(err.number))?;

                            // TODO: find out what all the other stuff means (“TGCO”?)
                            // there may be information about the graph structure in this tag
                            let color_id = match component_type {
                                ComponentType::Fill => {
                                    // fill
                                    let color_id = match input.read_u8()? {
                                        0x00 => None,
                                        0x01 => {
                                            let color_pos = len - 24;
                                            for _ in 2..color_pos {
                                                input.read_u8()?;
                                            }
                                            Some(input.read_u64::<LE>()?)
                                        }
                                        t => {
                                            return Err(ReadError::UnknownMystery(format!(
                                                "unexpected second TGSD byte after 0x00: {}",
                                                t
                                            )))
                                        }
                                    };
                                    color_id
                                }
                                ComponentType::Unknown1 => None,
                                ComponentType::Stroke => {
                                    // stroke (the invisible kind)
                                    None
                                }
                                ComponentType::Pencil => {
                                    // pencil stroke
                                    let v = input.read_u32::<LE>()?;
                                    if v != 0x41200000 {
                                        // TODO: figure out what this means
                                        // (maybe some kind of ID, because it does not seem important for the data)
                                        /*return Err(ReadError::UnknownMystery(format!(
                                            "unexpected bytes in TGSD pencil: {v:08x} (expected 41200000)",
                                        )));*/
                                    }
                                    Some(input.read_u64::<LE>()?)
                                }
                            };

                            // FIXME: is there any interesting data here, ever?
                            // seems to just be a bunch of 0 bytes, usually...
                            input.read_to_end(&mut Vec::new())?;

                            tags.push(ShapeComponentData::Info(ComponentInfo {
                                ty: component_type,
                                color_id,
                                raw: Bytes(raw),
                            }));
                        };

                        // for some reason, TGSD is always followed by an extra byte that indicates
                        // how to proceed
                        let extra_byte = input.read_u8()?;
                        match extra_byte {
                            0 => {
                                // stop
                                let trailer = input.read_u32::<LE>()?;
                                trace!("trailer: {:08x?}", trailer);
                                break;
                            }
                            1 => {
                                // normal case: continue reading
                            }
                            n => {
                                return Err(ReadError::UnknownMystery(format!(
                                    "unexpected byte that follows TGSD: {:02x?}",
                                    n
                                )))
                            }
                        }
                    }
                    ShapeComponentTag::Tgbp => {
                        let len = input.read_u32::<LE>()?;
                        let mut input = (&mut input).take(len as u64);
                        tags.push(ShapeComponentData::Path(Path::read(&mut input)?));
                    }
                    ShapeComponentTag::Tgtb => {
                        let thickness = read_tgtb(&mut input)?;
                        tags.push(ShapeComponentData::Thickness(thickness));
                    }
                    ShapeComponentTag::Tgti => {
                        let len = input.read_u32::<LE>()?;
                        let mut input = (&mut input).take(len as u64);
                        // TODO
                        let mut data = Vec::new();
                        input.read_to_end(&mut data)?;
                        tags.push(ShapeComponentData::Tgti(Bytes(data)));
                    }
                }
            }

            paths.push(ShapeComponent { tags });
            component_index += 1;
        }

        shapes.push(VectorShape {
            ty: shape_type,
            components: paths,
        });
        shape_index += 1;
    }

    read_layer_trailer(&mut input)?;

    Ok(LayerData::Vector(shapes))
}

/// Harmony 22 may emit pencil metadata after the final counted shape and before
/// the fixed vector-layer trailer. Older files go directly to the trailer.
fn read_layer_trailer(input: &mut impl Read) -> Result<(), ReadError> {
    loop {
        let mut prefix = [0; 4];
        input.read_exact(&mut prefix)?;

        if prefix == *b"tGTB" {
            let _ = read_tgtb(input)?;
            continue;
        }

        if prefix == *b"tGTI" {
            let len = input.read_u32::<LE>()?;
            let mut skipped = vec![0u8; len as usize];
            input.read_exact(&mut skipped)?;
            continue;
        }

        let mut trailer = [0; LAYER_TRAILER.len()];
        trailer[..prefix.len()].copy_from_slice(&prefix);
        input.read_exact(&mut trailer[prefix.len()..])?;
        if trailer != LAYER_TRAILER {
            return Err(ReadError::UnknownMystery(format!(
                "unexpected layer trailer: {:02?}",
                trailer
            )));
        }
        return Ok(());
    }
}

#[cfg(test)]
mod tests {
    use super::{read_layer_trailer, LAYER_TRAILER};

    #[test]
    fn accepts_legacy_trailer_without_metadata() {
        let mut input = LAYER_TRAILER;
        read_layer_trailer(&mut input).unwrap();
    }

    #[test]
    fn accepts_harmony_22_pencil_metadata_before_trailer() {
        let mut data = Vec::new();
        data.extend_from_slice(b"tGTB");
        data.extend_from_slice(&29u32.to_le_bytes());
        data.push(0); // reuse a previously defined thickness path
        data.extend_from_slice(&0u32.to_le_bytes()); // path id
        data.extend_from_slice(&0.0f32.to_le_bytes());
        data.extend_from_slice(&0u64.to_le_bytes());
        data.extend_from_slice(&1.0f32.to_le_bytes());
        data.extend_from_slice(&0u64.to_le_bytes());
        data.extend_from_slice(LAYER_TRAILER);

        read_layer_trailer(&mut data.as_slice()).unwrap();
    }

    #[test]
    fn accepts_pencil_info_before_trailer() {
        let mut data = Vec::new();
        data.extend_from_slice(b"tGTI");
        data.extend_from_slice(&3u32.to_le_bytes());
        data.extend_from_slice(&[1, 2, 3]);
        data.extend_from_slice(LAYER_TRAILER);

        read_layer_trailer(&mut data.as_slice()).unwrap();
    }
}
