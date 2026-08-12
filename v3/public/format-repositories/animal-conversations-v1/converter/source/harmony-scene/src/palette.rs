use crate::fs::{FileSystem, FileSystemPath};
use std::collections::HashMap;
use std::io;
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq)]
pub struct PaletteListFile {
    pub entries: Vec<PaletteListFileEntry>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PaletteListFileEntry {
    Link {
        // I’m just guessing here
        local_path: String,
        absolute_path: String,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct PaletteList {
    pub palettes: HashMap<String, PaletteFile>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PaletteFile {
    pub entries: Vec<PaletteFileEntry>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PaletteFileEntry {
    Solid {
        name: String,
        id: u64,
        value: [u8; 4],
    },
    Gradient {
        name: String,
        id: u64,
        ty: GradientType,
        stops: Vec<GradientStop>,
    },
    TbPencilTexture,
    Texture {
        name: String,
        id: u64,
        ty: TextureType,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum GradientType {
    Linear,
    Radial,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TextureType {
    Tile,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GradientStop {
    pub pos: f64,
    pub value: [u8; 4],
}

mod parsers {
    use nom::branch::alt;
    use nom::bytes::complete::{escaped_transform, tag, take_while, take_while1};
    use nom::character::complete::{digit1, hex_digit1};
    use nom::combinator::{eof, map, map_res, value};
    use nom::multi::{many0, separated_list0};
    use nom::number::complete::recognize_float;
    use nom::sequence::{delimited, preceded, tuple};
    use nom::IResult;
    use std::str::FromStr;

    fn line_break(i: &str) -> IResult<&str, ()> {
        map(alt((tag("\n"), tag("\r\n"))), |_| ())(i)
    }

    fn ws0(i: &str) -> IResult<&str, ()> {
        map(take_while(char::is_whitespace), |_| ())(i)
    }
    fn ws1(i: &str) -> IResult<&str, ()> {
        map(take_while1(char::is_whitespace), |_| ())(i)
    }

    fn quoted_string(i: &str) -> IResult<&str, String> {
        delimited(
            tag("\""),
            escaped_transform(
                take_while1(|c| c != '\\' && c != '"'),
                '\\',
                alt((
                    value('\\', tag("\\")),
                    value('"', tag("\"")),
                    value('\n', tag("n")),
                    value('\r', tag("r")),
                    value('\t', tag("t")),
                )),
            ),
            tag("\""),
        )(i)
    }

    fn bare_string(i: &str) -> IResult<&str, String> {
        if i.starts_with('"') {
            quoted_string(i)
        } else {
            map(take_while1(|c: char| !c.is_whitespace()), |s: &str| {
                s.to_string()
            })(i)
        }
    }

    fn palette_list_entry(i: &str) -> IResult<&str, super::PaletteListFileEntry> {
        let (i, _) = line_break(i)?;
        let (i, local_path) = bare_string(i)?;
        let (i, _) = ws1(i)?;
        let (i, _) = tag("LINK")(i)?;
        let (i, _) = ws1(i)?;
        let (i, absolute_path) = bare_string(i)?;

        Ok((
            i,
            super::PaletteListFileEntry::Link {
                local_path: local_path.to_owned(),
                absolute_path: absolute_path.to_owned(),
            },
        ))
    }

    pub fn palette_list(i: &str) -> IResult<&str, super::PaletteListFile> {
        let (i, _) = tag("ToonBoomAnimationInc PaletteList 1")(i)?;
        let (i, entries) = many0(palette_list_entry)(i)?;
        let (i, _) = ws0(i)?;
        let (i, _) = eof(i)?;

        Ok((i, super::PaletteListFile { entries }))
    }

    fn hex_literal(i: &str) -> IResult<&str, u64> {
        map_res(preceded(tag("0x"), hex_digit1), |i| {
            u64::from_str_radix(i, 16)
        })(i)
    }

    fn float_literal(i: &str) -> IResult<&str, f64> {
        map_res(recognize_float, f64::from_str)(i)
    }

    /// Parses R G B A (e.g. `255 0 0 255`)
    fn color_value(i: &str) -> IResult<&str, [u8; 4]> {
        fn one(i: &str) -> IResult<&str, u8> {
            map_res(digit1, u8::from_str)(i)
        }

        let (i, r) = one(i)?;
        let (i, _) = ws1(i)?;
        let (i, g) = one(i)?;
        let (i, _) = ws1(i)?;
        let (i, b) = one(i)?;
        let (i, _) = ws1(i)?;
        let (i, a) = one(i)?;

        Ok((i, [r, g, b, a]))
    }

    fn solid_color_entry(i: &str) -> IResult<&str, super::PaletteFileEntry> {
        map(
            preceded(
                tuple((tag("Solid"), ws1)),
                tuple((bare_string, ws1, hex_literal, ws1, color_value)),
            ),
            |(name, _, id, _, value)| super::PaletteFileEntry::Solid { name, id, value },
        )(i)
    }

    fn gradient_entry(i: &str) -> IResult<&str, super::PaletteFileEntry> {
        map(
            preceded(
                tuple((tag("Gradient"), ws1)),
                tuple((
                    bare_string,
                    ws1,
                    hex_literal,
                    ws1,
                    alt((
                        value(super::GradientType::Linear, tag("Linear")),
                        value(super::GradientType::Radial, tag("Radial")),
                    )),
                    ws1,
                    delimited(
                        tuple((tag("{"), ws0)),
                        separated_list0(
                            tuple((ws0, tag(","), ws0)),
                            map(
                                tuple((float_literal, ws1, color_value)),
                                |(pos, _, value)| super::GradientStop { pos, value },
                            ),
                        ),
                        tuple((ws0, tag("}"))),
                    ),
                )),
            ),
            |(name, _, id, _, ty, _, stops)| super::PaletteFileEntry::Gradient {
                name,
                id,
                ty,
                stops,
            },
        )(i)
    }

    fn tb_pencil_texture_string_entry(i: &str) -> IResult<&str, super::PaletteFileEntry> {
        // I have no idea what's going on here
        value(
            super::PaletteFileEntry::TbPencilTexture,
            tag("\"TB_Pencil_Texture|\""),
        )(i)
    }

    fn texture_entry(i: &str) -> IResult<&str, super::PaletteFileEntry> {
        map(
            preceded(
                tuple((tag("Texture"), ws1)),
                tuple((
                    bare_string,
                    ws1,
                    hex_literal,
                    ws1,
                    alt((value(super::TextureType::Tile, tag("Tile")),)),
                )),
            ),
            |(name, _, id, _, ty)| super::PaletteFileEntry::Texture { name, id, ty },
        )(i)
    }

    fn palette_file_entry(i: &str) -> IResult<&str, super::PaletteFileEntry> {
        alt((
            solid_color_entry,
            gradient_entry,
            tb_pencil_texture_string_entry,
            texture_entry,
        ))(i)
    }

    pub fn palette_file(i: &str) -> IResult<&str, super::PaletteFile> {
        let (i, _) = tag("ToonBoomAnimationInc PaletteFile 2")(i)?;
        let (i, _) = line_break(i)?;
        let (i, entries) = separated_list0(ws1, palette_file_entry)(i)?;
        let (i, _) = ws0(i)?;
        let (i, _) = eof(i)?;

        Ok((i, super::PaletteFile { entries }))
    }

    #[test]
    fn test_parsers() {
        let string_example = r#""quoted\" \nstring""#;
        assert_eq!(
            quoted_string(string_example),
            Ok(("", String::from("quoted\" \nstring")))
        );

        let example_file = "ToonBoomAnimationInc PaletteFile 2\nSolid \"A Color\" 0x00 0 0 255 255";
        palette_file(example_file).unwrap();

        let gradient = "Gradient Name 0x00 Linear { 0.0 255 0 0 255, 100.0 255 0 255 255 }";
        assert_eq!(
            gradient_entry(gradient),
            Ok((
                "",
                super::PaletteFileEntry::Gradient {
                    name: String::from("Name"),
                    id: 0,
                    ty: super::GradientType::Linear,
                    stops: vec![
                        super::GradientStop {
                            pos: 0.,
                            value: [255, 0, 0, 255]
                        },
                        super::GradientStop {
                            pos: 100.,
                            value: [255, 0, 255, 255]
                        }
                    ],
                }
            ))
        );
    }
}

impl FromStr for PaletteListFile {
    type Err = io::Error;

    fn from_str(s: &str) -> io::Result<Self> {
        parsers::palette_list(s)
            .map(|(_, res)| res)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))
    }
}

impl PaletteList {
    pub fn read_all<Fs>(fs: &Fs, directory: &Fs::Path, list: &PaletteListFile) -> io::Result<Self>
    where
        Fs: FileSystem,
    {
        let mut palettes = HashMap::new();
        for palette in &list.entries {
            match palette {
                PaletteListFileEntry::Link { local_path, .. } => {
                    let palette_path = directory.join_str(&format!("{local_path}.plt"));
                    let palette = fs.read_to_string(&palette_path)?;
                    let palette = PaletteFile::from_str(&palette)?;
                    palettes.insert(local_path.clone(), palette);
                }
            }
        }
        Ok(Self { palettes })
    }
}

impl FromStr for PaletteFile {
    type Err = io::Error;

    fn from_str(s: &str) -> io::Result<Self> {
        parsers::palette_file(s)
            .map(|(_, res)| res)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))
    }
}
