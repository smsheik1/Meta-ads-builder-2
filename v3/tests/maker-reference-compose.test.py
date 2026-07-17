import importlib.util
import json
import tempfile
from pathlib import Path

import cv2
import numpy as np


script_path = Path(__file__).parents[1] / "scripts" / "maker-reference-ocr.py"
spec = importlib.util.spec_from_file_location("maker_reference_ocr", script_path)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    original = np.full((20, 20, 3), (0, 0, 255), dtype=np.uint8)
    repaired = np.full((20, 20, 3), (255, 0, 0), dtype=np.uint8)
    cv2.imwrite(str(root / "reference.png"), original)
    cv2.imwrite(str(root / "repaired.png"), repaired)
    (root / "ocr.json").write_text(json.dumps({"width": 20, "height": 20, "texts": []}))
    (root / "claims.json").write_text(json.dumps({
        "editableTextEvidenceIds": [],
        "fixedFrameAssets": [{"assetId": "tile", "shape": "rectangle", "x": 1, "y": 2, "width": 4, "height": 5}],
        "preRepairedAssetIds": ["subject"],
    }))
    (root / "sam.json").write_text(json.dumps([{
        "assetId": "subject",
        "result": {
            "scores": [0.9],
            "masks": [[[1] * 6 for _ in range(6)]],
            "masks_offset": [[7, 7]],
        },
    }]))

    module.compose_reference(
        root / "reference.png",
        root / "ocr.json",
        root / "claims.json",
        root / "sam.json",
        root,
        root / "repaired.png",
    )

    background = cv2.imread(str(root / "background.jpg"))
    assert background is not None
    assert int(background[10, 10, 0]) > 240, "The repaired blue background must survive composition."
    assert int(background[10, 10, 2]) < 15, "The original red subject must not be painted back."
    composition = json.loads((root / "composition.json").read_text())
    assert [asset["assetId"] for asset in composition["assets"]] == ["tile", "subject"]
    tile = cv2.imread(str(root / "asset-tile.png"))
    assert tile is not None and tile.shape[:2] == (5, 4), "A fixed frame must be cropped at its declared size."
    assert int(tile[0, 0, 2]) > 240, "The fixed frame crop must preserve the original pixels."

print("maker reference composition tests passed")
