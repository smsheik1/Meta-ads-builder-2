//! File system abstractions

use std::io::Read;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::{fmt, io};

/// An abstract path type that can be used with a file system.
pub trait FileSystemPath: fmt::Debug + Clone + FromStr {
    /// Pops the last path component. Returns success.
    fn pop(&mut self) -> bool;
    fn join_str(&self, other: &str) -> Self;
}

/// Provides access to a file system.
pub trait FileSystem {
    type Path: FileSystemPath;
    type File: Read;

    fn read(&self, path: &Self::Path) -> io::Result<Self::File>;

    fn read_to_string(&self, path: &Self::Path) -> io::Result<String> {
        let mut file = self.read(path)?;
        let mut string = String::new();
        file.read_to_string(&mut string)?;
        Ok(string)
    }
}

impl FileSystemPath for PathBuf {
    fn pop(&mut self) -> bool {
        PathBuf::pop(self)
    }

    fn join_str(&self, other: &str) -> Self {
        Path::join(self, other)
    }
}

/// The OS file system [`std::fs`].
#[derive(Debug)]
pub struct OsFileSystem;
impl FileSystem for OsFileSystem {
    type Path = PathBuf;
    type File = std::fs::File;
    fn read(&self, path: &Self::Path) -> io::Result<Self::File> {
        std::fs::File::open(path)
    }
}
