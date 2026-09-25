from datetime import datetime

import numpy as np
from rasterio.io import MemoryFile
from rasterio.transform import from_origin


def geotiff_fixture(
    *,
    bands: int,
    acquisition_at: datetime,
    sensor: str = "Sentinel-2",
    transform=None,
) -> bytes:
    with MemoryFile() as memory_file:
        with memory_file.open(
            driver="GTiff",
            width=4,
            height=4,
            count=bands,
            dtype="uint16",
            crs="EPSG:4326",
            transform=transform or from_origin(0, 4, 1, 1),
        ) as dataset:
            for index in range(1, bands + 1):
                dataset.write(np.full((4, 4), index, dtype="uint16"), index)
            dataset.update_tags(
                ACQUISITION_DATETIME=acquisition_at.isoformat(),
                SENSOR=sensor,
            )
        return memory_file.read()
